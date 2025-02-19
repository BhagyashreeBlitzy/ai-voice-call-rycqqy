import { Message, MessageCreateParams, MessageRole } from '../../interfaces/message.interface';
import { MessageRepository } from '../../db/repositories/message.repository';
import { AudioStorageService } from '../storage/audioStorage.service';
import { createError } from '../../utils/error.utils';
import { Result, UUID } from '../../types/common.types';
import { logger } from '../../utils/logger.utils';
import { ERROR_CODES } from '../../constants/error.constants';

/**
 * Service class implementing message management functionality for the AI Voice Agent system
 * Handles both text and voice messages with secure storage and retrieval operations
 * @version 1.0.0
 */
export class MessageService {
  private readonly urlCache: Map<string, { url: string; expiry: number }>;
  private readonly URL_CACHE_TTL = 240; // 4 minutes in seconds
  private readonly RETRY_CONFIG = {
    maxAttempts: 3,
    backoffMs: 1000,
  };

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly audioStorage: AudioStorageService
  ) {
    this.urlCache = new Map();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    logger.info('Initializing MessageService', {
      component: 'MessageService',
      cacheSize: this.urlCache.size,
    });
  }

  /**
   * Creates a new message with optional audio recording
   * Implements security checks and retry logic
   */
  public async createMessage(params: MessageCreateParams): Promise<Result<Message>> {
    try {
      logger.debug('Creating new message', {
        conversationId: params.conversationId,
        role: params.role,
        hasAudio: !!params.audioRecordingId,
      });

      // Validate input parameters
      if (!this.validateMessageParams(params)) {
        return {
          success: false,
          data: null as any,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            details: 'Invalid message parameters',
          }),
          metadata: {},
        };
      }

      // Handle audio recording if present
      if (params.audioRecordingId) {
        const audioResult = await this.validateAndProcessAudio(params.audioRecordingId);
        if (!audioResult.success) {
          return audioResult as Result<Message>;
        }
      }

      // Create message with retry logic
      let attempts = 0;
      while (attempts < this.RETRY_CONFIG.maxAttempts) {
        const result = await this.messageRepository.create(params);
        if (result.success) {
          logger.info('Message created successfully', {
            messageId: result.data.id,
            conversationId: params.conversationId,
          });
          return result;
        }
        attempts++;
        if (attempts < this.RETRY_CONFIG.maxAttempts) {
          await this.delay(this.RETRY_CONFIG.backoffMs * attempts);
        }
      }

      throw new Error('Failed to create message after retries');
    } catch (error) {
      logger.error('Error creating message', {
        error,
        params: { ...params, audioRecordingId: '[REDACTED]' },
      });
      return {
        success: false,
        data: null as any,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error.message,
        }),
        metadata: {},
      };
    }
  }

  /**
   * Retrieves a message by ID with cached audio URL if present
   */
  public async getMessage(id: UUID): Promise<Result<Message>> {
    try {
      const result = await this.messageRepository.findById(id);
      if (!result.success) {
        return result;
      }

      const message = result.data;
      if (message.audioRecordingId) {
        const audioUrl = await this.getAudioUrl(message.audioRecordingId);
        if (audioUrl.success) {
          message.metadata = {
            ...message.metadata,
            audioUrl: audioUrl.data,
          };
        }
      }

      return {
        success: true,
        data: message,
        error: null,
        metadata: {},
      };
    } catch (error) {
      logger.error('Error retrieving message', { error, messageId: id });
      return {
        success: false,
        data: null as any,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error.message,
        }),
        metadata: {},
      };
    }
  }

  /**
   * Retrieves all messages for a conversation with optimized audio URL handling
   */
  public async getMessagesByConversation(
    conversationId: UUID,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Result<Message[]>> {
    try {
      const result = await this.messageRepository.findByConversationId(
        conversationId,
        options
      );

      if (!result.success) {
        return result;
      }

      // Process audio URLs in parallel
      const messages = await Promise.all(
        result.data.map(async (message) => {
          if (message.audioRecordingId) {
            const audioUrl = await this.getAudioUrl(message.audioRecordingId);
            if (audioUrl.success) {
              message.metadata = {
                ...message.metadata,
                audioUrl: audioUrl.data,
              };
            }
          }
          return message;
        })
      );

      return {
        success: true,
        data: messages,
        error: null,
        metadata: {},
      };
    } catch (error) {
      logger.error('Error retrieving conversation messages', {
        error,
        conversationId,
      });
      return {
        success: false,
        data: null as any,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error.message,
        }),
        metadata: {},
      };
    }
  }

  /**
   * Updates an existing message with audit logging and validation
   */
  public async updateMessage(
    id: UUID,
    updates: Partial<Message>
  ): Promise<Result<Message>> {
    try {
      // Validate update payload
      if (!this.validateUpdatePayload(updates)) {
        return {
          success: false,
          data: null as any,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            details: 'Invalid update payload',
          }),
          metadata: {},
        };
      }

      const result = await this.messageRepository.update(id, updates);
      if (result.success) {
        // Invalidate audio URL cache if audio recording changed
        if (updates.audioRecordingId) {
          this.urlCache.delete(updates.audioRecordingId);
        }
        logger.info('Message updated successfully', { messageId: id });
      }

      return result;
    } catch (error) {
      logger.error('Error updating message', { error, messageId: id });
      return {
        success: false,
        data: null as any,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error.message,
        }),
        metadata: {},
      };
    }
  }

  /**
   * Private helper methods
   */
  private validateMessageParams(params: MessageCreateParams): boolean {
    return !!(
      params.conversationId &&
      params.content &&
      Object.values(MessageRole).includes(params.role)
    );
  }

  private validateUpdatePayload(updates: Partial<Message>): boolean {
    const allowedUpdates = ['content', 'metadata', 'audioRecordingId'];
    return Object.keys(updates).every((key) => allowedUpdates.includes(key));
  }

  private async validateAndProcessAudio(
    audioRecordingId: UUID
  ): Promise<Result<boolean>> {
    try {
      const validationResult = await this.audioStorage.validateAudioMetadata(
        audioRecordingId
      );
      if (!validationResult.success) {
        return {
          success: false,
          data: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            details: 'Invalid audio recording',
          }),
          metadata: {},
        };
      }
      return { success: true, data: true, error: null, metadata: {} };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error.message,
        }),
        metadata: {},
      };
    }
  }

  private async getAudioUrl(audioRecordingId: UUID): Promise<Result<string>> {
    const cached = this.urlCache.get(audioRecordingId);
    if (cached && cached.expiry > Date.now()) {
      return { success: true, data: cached.url, error: null, metadata: {} };
    }

    try {
      const result = await this.audioStorage.getSignedUrl(audioRecordingId);
      if (result.success) {
        this.urlCache.set(audioRecordingId, {
          url: result.data,
          expiry: Date.now() + this.URL_CACHE_TTL * 1000,
        });
      }
      return result;
    } catch (error) {
      return {
        success: false,
        data: '',
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error.message,
        }),
        metadata: {},
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}