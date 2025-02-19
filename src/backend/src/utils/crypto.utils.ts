/**
 * Cryptographic utility functions for secure data handling in the AI Voice Agent application
 * Implements AES-256-GCM encryption and Argon2id hashing for sensitive data protection
 * @version 1.0.0
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { hash, verify } from 'argon2'; // ^0.31.0
import { Result } from '../types/common.types';

// Crypto constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Argon2id configuration
const HASH_CONFIG = {
  type: 2, // Argon2id
  memoryCost: 65536, // 64MB
  timeCost: 3, // 3 iterations
  parallelism: 4,
  hashLength: 32
};

/**
 * Generates a cryptographically secure random key
 * @param length - Number of bytes for the key
 * @returns Promise resolving to Result containing the generated key buffer
 */
export async function generateKey(length: number): Promise<Result<Buffer>> {
  try {
    if (length <= 0) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_LENGTH',
          message: 'Key length must be positive',
          details: { length },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const key = randomBytes(length);
    return {
      success: true,
      data: key,
      error: null,
      metadata: { keyLength: length }
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'KEY_GENERATION_ERROR',
        message: 'Failed to generate key',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Encrypts data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - Encryption key (must be 32 bytes for AES-256)
 * @returns Promise resolving to Result containing encrypted data, IV, and auth tag
 */
export async function encryptAES(data: Buffer, key: Buffer): Promise<Result<{
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
}>> {
  try {
    if (key.length !== 32) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_KEY_LENGTH',
          message: 'Key must be 32 bytes for AES-256',
          details: { keyLength: key.length },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    const ciphertext = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();

    return {
      success: true,
      data: { ciphertext, iv, tag },
      error: null,
      metadata: {
        algorithm: ALGORITHM,
        ivLength: IV_LENGTH,
        tagLength: AUTH_TAG_LENGTH
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'ENCRYPTION_ERROR',
        message: 'Failed to encrypt data',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Decrypts AES-256-GCM encrypted data
 * @param ciphertext - Encrypted data
 * @param key - Decryption key
 * @param iv - Initialization vector used during encryption
 * @param tag - Authentication tag from encryption
 * @returns Promise resolving to Result containing decrypted data
 */
export async function decryptAES(
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  tag: Buffer
): Promise<Result<Buffer>> {
  try {
    if (key.length !== 32) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_KEY_LENGTH',
          message: 'Key must be 32 bytes for AES-256',
          details: { keyLength: key.length },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return {
      success: true,
      data: decrypted,
      error: null,
      metadata: {
        algorithm: ALGORITHM,
        ivLength: iv.length,
        tagLength: tag.length
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'DECRYPTION_ERROR',
        message: 'Failed to decrypt data',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Hashes password using Argon2id with secure parameters
 * @param password - Password to hash
 * @returns Promise resolving to Result containing hashed password
 */
export async function hashPassword(password: string): Promise<Result<string>> {
  try {
    if (!password || password.length < 8) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Password must be at least 8 characters',
          details: { passwordLength: password?.length ?? 0 },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const salt = randomBytes(SALT_LENGTH);
    const hashedPassword = await hash(password, {
      ...HASH_CONFIG,
      salt
    });

    return {
      success: true,
      data: hashedPassword,
      error: null,
      metadata: {
        algorithm: 'argon2id',
        parameters: HASH_CONFIG
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'HASH_ERROR',
        message: 'Failed to hash password',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}

/**
 * Verifies password against Argon2id hash
 * @param password - Password to verify
 * @param hash - Stored password hash
 * @returns Promise resolving to Result containing verification status
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<Result<boolean>> {
  try {
    if (!password || !hash) {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Password and hash are required',
          details: {
            passwordProvided: !!password,
            hashProvided: !!hash
          },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }

    const isValid = await verify(hash, password);
    
    return {
      success: true,
      data: isValid,
      error: null,
      metadata: {
        algorithm: 'argon2id'
      }
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify password',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {}
    };
  }
}