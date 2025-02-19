import { PrismaClient } from '@prisma/client'; // v5.0.0
import winston from 'winston'; // v3.10.0
import { prisma } from '../../config/database.config';
import { Message, MessageCreateParams, MessageRole } from '../../interfaces/message.interface';
import { Result, UUID } from '../../types/common.types';

/**
 * Repository class for managing message data persistence with comprehensive security and error handling
 * Implements transactional operations for message and audio recording management
 */
export class MessageRepository {
  private readonly logger: winston.Logger;
  private readonly TRANSACTION_TIMEOUT = 5000; // 5 seconds

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'logs/message-repository-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/message-repository-combined.log' })
      ]
    });
  }

  /**
   * Creates a new message with optional audio recording using transaction
   * @param params Message creation parameters
   * @returns Promise resolving to Result containing created message or error
   */
  async create(params: MessageCreateParams): Promise<Result<Message>> {
    try {
      // Validate required parameters
      if (!params.conversationId || !params.content || !params.role) {
        throw new Error('Missing required message parameters');
      }

      // Validate role enum
      if (!Object.values(MessageRole).includes(params.role)) {
        throw new Error('Invalid message role');
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create message record
        const message = await tx.message.create({
          data: {
            conversationId: params.conversationId,
            content: params.content,
            role: params.role,
            metadata: params.metadata || {},
            audioRecordingId: params.audioRecordingId || null
          },
          include: {
            audioRecording: true
          }
        });

        return message;
      }, {
        timeout: this.TRANSACTION_TIMEOUT
      });

      this.logger.info('Message created successfully', { messageId: result.id });

      return {
        success: true,
        data: result as Message,
        error: null,
        metadata: {}
      };

    } catch (error) {
      this.logger.error('Error creating message', { error, params });
      return {
        success: false,
        data: null as any,
        error: {
          code: 'MESSAGE_CREATE_ERROR',
          message: error.message,
          details: {},
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Retrieves a message by ID including audio recording
   * @param id Message identifier
   * @returns Promise resolving to Result containing found message or error
   */
  async findById(id: UUID): Promise<Result<Message>> {
    try {
      const message = await prisma.message.findUnique({
        where: { id },
        include: {
          audioRecording: true
        }
      });

      if (!message) {
        throw new Error('Message not found');
      }

      this.logger.info('Message retrieved successfully', { messageId: id });

      return {
        success: true,
        data: message as Message,
        error: null,
        metadata: {}
      };

    } catch (error) {
      this.logger.error('Error retrieving message', { error, messageId: id });
      return {
        success: false,
        data: null as any,
        error: {
          code: 'MESSAGE_RETRIEVE_ERROR',
          message: error.message,
          details: {},
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Retrieves all messages for a conversation with pagination
   * @param conversationId Conversation identifier
   * @param options Pagination and sorting options
   * @returns Promise resolving to Result containing message array or error
   */
  async findByConversationId(
    conversationId: UUID,
    options: { limit?: number; offset?: number; sortDesc?: boolean } = {}
  ): Promise<Result<Message[]>> {
    try {
      const messages = await prisma.message.findMany({
        where: {
          conversationId
        },
        include: {
          audioRecording: true
        },
        take: options.limit || 50,
        skip: options.offset || 0,
        orderBy: {
          createdAt: options.sortDesc ? 'desc' : 'asc'
        }
      });

      this.logger.info('Messages retrieved successfully', { 
        conversationId,
        count: messages.length 
      });

      return {
        success: true,
        data: messages as Message[],
        error: null,
        metadata: {}
      };

    } catch (error) {
      this.logger.error('Error retrieving messages', { error, conversationId });
      return {
        success: false,
        data: null as any,
        error: {
          code: 'MESSAGES_RETRIEVE_ERROR',
          message: error.message,
          details: {},
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Updates an existing message with transaction support
   * @param id Message identifier
   * @param data Partial message update data
   * @returns Promise resolving to Result containing updated message or error
   */
  async update(id: UUID, data: Partial<Message>): Promise<Result<Message>> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const message = await tx.message.update({
          where: { id },
          data: {
            content: data.content,
            metadata: data.metadata,
            audioRecordingId: data.audioRecordingId
          },
          include: {
            audioRecording: true
          }
        });

        return message;
      }, {
        timeout: this.TRANSACTION_TIMEOUT
      });

      this.logger.info('Message updated successfully', { messageId: id });

      return {
        success: true,
        data: result as Message,
        error: null,
        metadata: {}
      };

    } catch (error) {
      this.logger.error('Error updating message', { error, messageId: id });
      return {
        success: false,
        data: null as any,
        error: {
          code: 'MESSAGE_UPDATE_ERROR',
          message: error.message,
          details: {},
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Securely deletes a message and its audio recording using transaction
   * @param id Message identifier
   * @returns Promise resolving to Result indicating success or error
   */
  async delete(id: UUID): Promise<Result<void>> {
    try {
      await prisma.$transaction(async (tx) => {
        // Delete associated audio recording first
        await tx.audioRecording.deleteMany({
          where: {
            messageId: id
          }
        });

        // Delete the message
        await tx.message.delete({
          where: { id }
        });
      }, {
        timeout: this.TRANSACTION_TIMEOUT
      });

      this.logger.info('Message deleted successfully', { messageId: id });

      return {
        success: true,
        data: undefined,
        error: null,
        metadata: {}
      };

    } catch (error) {
      this.logger.error('Error deleting message', { error, messageId: id });
      return {
        success: false,
        data: null as any,
        error: {
          code: 'MESSAGE_DELETE_ERROR',
          message: error.message,
          details: {},
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }
}