import { PrismaClient, Conversation, Message, Prisma } from '@prisma/client'; // v5.0.0
import { prisma } from '../../config/database.config';

/**
 * Result type for repository operations
 */
type Result<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

/**
 * Repository class for managing conversation data persistence with support for 
 * transactions, audit logging, and row-level security
 */
export class ConversationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Creates a new conversation with audit logging and security checks
   * @param data Conversation creation data
   * @param userId User ID for security context
   * @returns Promise resolving to Result containing created conversation
   */
  async create(
    data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.$transaction(async (tx) => {
        // Create conversation with security context
        const newConversation = await tx.conversation.create({
          data: {
            ...data,
            context: {
              ...data.context,
              userId // Embed user context for row-level security
            }
          }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            entityType: 'conversation',
            entityId: newConversation.id,
            action: 'CREATE',
            userId,
            timestamp: new Date()
          }
        });

        return newConversation;
      });

      return { success: true, data: conversation };
    } catch (error) {
      console.error('Conversation creation failed:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Retrieves a conversation by ID with security checks
   * @param id Conversation ID
   * @param userId User ID for security context
   * @returns Promise resolving to Result containing found conversation
   */
  async findById(id: string, userId: string): Promise<Result<Conversation & { messages: Message[] }>> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id,
          context: {
            path: ['userId'],
            equals: userId
          }
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!conversation) {
        return { 
          success: false, 
          error: new Error('Conversation not found or access denied') 
        };
      }

      return { success: true, data: conversation };
    } catch (error) {
      console.error('Conversation retrieval failed:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Finds conversations by session ID with security checks
   * @param sessionId Session ID to search for
   * @param userId User ID for security context
   * @returns Promise resolving to Result containing found conversations
   */
  async findBySessionId(
    sessionId: string,
    userId: string
  ): Promise<Result<Conversation[]>> {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: {
          sessionId,
          context: {
            path: ['userId'],
            equals: userId
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return { success: true, data: conversations };
    } catch (error) {
      console.error('Session conversations retrieval failed:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Updates a conversation with audit logging and security checks
   * @param id Conversation ID
   * @param data Update data
   * @param userId User ID for security context
   * @returns Promise resolving to Result containing updated conversation
   */
  async update(
    id: string,
    data: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>>,
    userId: string
  ): Promise<Result<Conversation>> {
    try {
      const conversation = await this.prisma.$transaction(async (tx) => {
        // Verify access rights
        const existing = await tx.conversation.findFirst({
          where: {
            id,
            context: {
              path: ['userId'],
              equals: userId
            }
          }
        });

        if (!existing) {
          throw new Error('Conversation not found or access denied');
        }

        // Update conversation
        const updated = await tx.conversation.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            entityType: 'conversation',
            entityId: id,
            action: 'UPDATE',
            userId,
            timestamp: new Date(),
            changes: data
          }
        });

        return updated;
      });

      return { success: true, data: conversation };
    } catch (error) {
      console.error('Conversation update failed:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Deletes a conversation with audit logging and security checks
   * @param id Conversation ID
   * @param userId User ID for security context
   * @returns Promise resolving to Result indicating deletion success
   */
  async delete(id: string, userId: string): Promise<Result<void>> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Verify access rights
        const existing = await tx.conversation.findFirst({
          where: {
            id,
            context: {
              path: ['userId'],
              equals: userId
            }
          }
        });

        if (!existing) {
          throw new Error('Conversation not found or access denied');
        }

        // Delete conversation and related messages
        await tx.message.deleteMany({
          where: { conversationId: id }
        });

        await tx.conversation.delete({
          where: { id }
        });

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            entityType: 'conversation',
            entityId: id,
            action: 'DELETE',
            userId,
            timestamp: new Date()
          }
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Conversation deletion failed:', error);
      return { success: false, error: error as Error };
    }
  }
}