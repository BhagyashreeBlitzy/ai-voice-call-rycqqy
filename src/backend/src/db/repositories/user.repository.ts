/**
 * User Repository Implementation
 * Handles data persistence operations for user management with enhanced security and validation
 * @version 1.0.0
 */

import { PrismaClientKnownRequestError } from '@prisma/client';
import { IUser, IUserCreateParams, IUserUpdateParams } from '../../interfaces/user.interface';
import { Result } from '../../types/common.types';
import { createError } from '../../utils/error.utils';
import { prisma } from '../../config/database.config';
import { validateEmail, validateUUID } from '../../utils/validation.utils';
import { logger } from '../../utils/logger.utils';
import { ERROR_CODES } from '../../constants/error.constants';

export class UserRepository {
  private readonly prismaClient: typeof prisma;
  private readonly queryTimeout: number;
  private readonly maxRetries: number;

  constructor(queryTimeout = 5000, maxRetries = 3) {
    this.prismaClient = prisma;
    this.queryTimeout = queryTimeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Creates a new user with comprehensive validation and error handling
   * @param params User creation parameters
   * @returns Result containing created user or error details
   */
  async createUser(params: IUserCreateParams): Promise<Result<IUser>> {
    try {
      // Validate email format
      const emailValidation = validateEmail(params.email);
      if (!emailValidation.success) {
        return {
          success: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            field: 'email',
            message: 'Invalid email format',
            value: params.email
          }),
          data: null as unknown as IUser,
          metadata: {}
        };
      }

      // Start transaction for atomic operation
      return await this.prismaClient.$transaction(async (tx) => {
        // Check for existing user
        const existingUser = await tx.user.findUnique({
          where: { email: params.email }
        });

        if (existingUser) {
          return {
            success: false,
            error: createError(ERROR_CODES.VALIDATION_ERROR, {
              field: 'email',
              message: 'Email already exists',
              value: params.email
            }),
            data: null as unknown as IUser,
            metadata: {}
          };
        }

        // Create user with retry logic
        let retryCount = 0;
        while (retryCount < this.maxRetries) {
          try {
            const user = await tx.user.create({
              data: {
                email: params.email,
                preferences: params.preferences || {},
                status: 'ACTIVE'
              },
              timeout: this.queryTimeout
            });

            logger.info('User created successfully', {
              userId: user.id,
              email: user.email
            });

            return {
              success: true,
              data: user as IUser,
              error: null,
              metadata: {}
            };
          } catch (error) {
            retryCount++;
            if (retryCount === this.maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        throw new Error('Failed to create user after maximum retries');
      });
    } catch (error) {
      logger.error('Error creating user', {
        error,
        params: { ...params, password: '[REDACTED]' }
      });

      return {
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }),
        data: null as unknown as IUser,
        metadata: {}
      };
    }
  }

  /**
   * Retrieves a user by ID with validation
   * @param id User UUID
   * @returns Result containing user or error details
   */
  async getUserById(id: string): Promise<Result<IUser>> {
    try {
      // Validate UUID format
      const uuidValidation = validateUUID(id);
      if (!uuidValidation.success) {
        return {
          success: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            field: 'id',
            message: 'Invalid UUID format',
            value: id
          }),
          data: null as unknown as IUser,
          metadata: {}
        };
      }

      const user = await this.prismaClient.user.findUnique({
        where: { id },
        timeout: this.queryTimeout
      });

      if (!user) {
        return {
          success: false,
          error: createError(ERROR_CODES.NOT_FOUND, {
            message: 'User not found',
            id
          }),
          data: null as unknown as IUser,
          metadata: {}
        };
      }

      return {
        success: true,
        data: user as IUser,
        error: null,
        metadata: {}
      };
    } catch (error) {
      logger.error('Error retrieving user', { error, userId: id });
      return {
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }),
        data: null as unknown as IUser,
        metadata: {}
      };
    }
  }

  /**
   * Retrieves a user by email with validation
   * @param email User email address
   * @returns Result containing user or error details
   */
  async getUserByEmail(email: string): Promise<Result<IUser>> {
    try {
      // Validate email format
      const emailValidation = validateEmail(email);
      if (!emailValidation.success) {
        return {
          success: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            field: 'email',
            message: 'Invalid email format',
            value: email
          }),
          data: null as unknown as IUser,
          metadata: {}
        };
      }

      const user = await this.prismaClient.user.findUnique({
        where: { email },
        timeout: this.queryTimeout
      });

      if (!user) {
        return {
          success: false,
          error: createError(ERROR_CODES.NOT_FOUND, {
            message: 'User not found',
            email
          }),
          data: null as unknown as IUser,
          metadata: {}
        };
      }

      return {
        success: true,
        data: user as IUser,
        error: null,
        metadata: {}
      };
    } catch (error) {
      logger.error('Error retrieving user by email', { error, email });
      return {
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }),
        data: null as unknown as IUser,
        metadata: {}
      };
    }
  }

  /**
   * Updates user information with validation
   * @param id User UUID
   * @param params Update parameters
   * @returns Result containing updated user or error details
   */
  async updateUser(id: string, params: IUserUpdateParams): Promise<Result<IUser>> {
    try {
      // Validate UUID format
      const uuidValidation = validateUUID(id);
      if (!uuidValidation.success) {
        return {
          success: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            field: 'id',
            message: 'Invalid UUID format',
            value: id
          }),
          data: null as unknown as IUser,
          metadata: {}
        };
      }

      // Validate email if provided
      if (params.email) {
        const emailValidation = validateEmail(params.email);
        if (!emailValidation.success) {
          return {
            success: false,
            error: createError(ERROR_CODES.VALIDATION_ERROR, {
              field: 'email',
              message: 'Invalid email format',
              value: params.email
            }),
            data: null as unknown as IUser,
            metadata: {}
          };
        }
      }

      return await this.prismaClient.$transaction(async (tx) => {
        // Check if user exists
        const existingUser = await tx.user.findUnique({
          where: { id }
        });

        if (!existingUser) {
          return {
            success: false,
            error: createError(ERROR_CODES.NOT_FOUND, {
              message: 'User not found',
              id
            }),
            data: null as unknown as IUser,
            metadata: {}
          };
        }

        // Update user with retry logic
        let retryCount = 0;
        while (retryCount < this.maxRetries) {
          try {
            const updatedUser = await tx.user.update({
              where: { id },
              data: {
                email: params.email,
                preferences: params.preferences ? {
                  ...existingUser.preferences,
                  ...params.preferences
                } : undefined,
                status: params.status
              },
              timeout: this.queryTimeout
            });

            logger.info('User updated successfully', {
              userId: updatedUser.id,
              email: updatedUser.email
            });

            return {
              success: true,
              data: updatedUser as IUser,
              error: null,
              metadata: {}
            };
          } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
              return {
                success: false,
                error: createError(ERROR_CODES.VALIDATION_ERROR, {
                  field: 'email',
                  message: 'Email already exists',
                  value: params.email
                }),
                data: null as unknown as IUser,
                metadata: {}
              };
            }
            retryCount++;
            if (retryCount === this.maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        throw new Error('Failed to update user after maximum retries');
      });
    } catch (error) {
      logger.error('Error updating user', {
        error,
        userId: id,
        params
      });

      return {
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }),
        data: null as unknown as IUser,
        metadata: {}
      };
    }
  }

  /**
   * Deletes a user with validation
   * @param id User UUID
   * @returns Result indicating success or error details
   */
  async deleteUser(id: string): Promise<Result<void>> {
    try {
      // Validate UUID format
      const uuidValidation = validateUUID(id);
      if (!uuidValidation.success) {
        return {
          success: false,
          error: createError(ERROR_CODES.VALIDATION_ERROR, {
            field: 'id',
            message: 'Invalid UUID format',
            value: id
          }),
          data: null as unknown as void,
          metadata: {}
        };
      }

      return await this.prismaClient.$transaction(async (tx) => {
        // Check if user exists
        const existingUser = await tx.user.findUnique({
          where: { id }
        });

        if (!existingUser) {
          return {
            success: false,
            error: createError(ERROR_CODES.NOT_FOUND, {
              message: 'User not found',
              id
            }),
            data: null as unknown as void,
            metadata: {}
          };
        }

        // Delete user with retry logic
        let retryCount = 0;
        while (retryCount < this.maxRetries) {
          try {
            await tx.user.delete({
              where: { id },
              timeout: this.queryTimeout
            });

            logger.info('User deleted successfully', {
              userId: id,
              email: existingUser.email
            });

            return {
              success: true,
              data: undefined,
              error: null,
              metadata: {}
            };
          } catch (error) {
            retryCount++;
            if (retryCount === this.maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        throw new Error('Failed to delete user after maximum retries');
      });
    } catch (error) {
      logger.error('Error deleting user', { error, userId: id });
      return {
        success: false,
        error: createError(ERROR_CODES.SYSTEM_ERROR, {
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }),
        data: null as unknown as void,
        metadata: {}
      };
    }
  }
}