/**
 * Unit tests for cryptographic utility functions
 * Tests secure data handling, encryption, hashing, and key management
 * @version 1.0.0
 */

import { describe, it, expect } from 'jest';
import { Result } from '../../src/types/common.types';
import {
  generateKey,
  encryptAES,
  decryptAES,
  hashPassword,
  verifyPassword
} from '../../src/utils/crypto.utils';

describe('Crypto Utils', () => {
  describe('generateKey', () => {
    it('should generate cryptographically secure key of 32 bytes', async () => {
      const result: Result<Buffer> = await generateKey(32);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.data.length).toBe(32);
      expect(result.metadata).toEqual({ keyLength: 32 });
    });

    it('should generate unique keys across multiple calls', async () => {
      const key1 = await generateKey(32);
      const key2 = await generateKey(32);
      
      expect(key1.success && key2.success).toBe(true);
      expect(key1.data.equals(key2.data)).toBe(false);
    });

    it('should fail with invalid key length', async () => {
      const result = await generateKey(0);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'INVALID_LENGTH',
        message: 'Key length must be positive'
      });
    });
  });

  describe('encryptAES/decryptAES', () => {
    it('should encrypt and decrypt data with authentication', async () => {
      const keyResult = await generateKey(32);
      expect(keyResult.success).toBe(true);
      
      const testData = Buffer.from('sensitive data');
      const encryptResult = await encryptAES(testData, keyResult.data);
      
      expect(encryptResult.success).toBe(true);
      expect(encryptResult.data).toHaveProperty('ciphertext');
      expect(encryptResult.data).toHaveProperty('iv');
      expect(encryptResult.data).toHaveProperty('tag');
      
      const { ciphertext, iv, tag } = encryptResult.data;
      const decryptResult = await decryptAES(ciphertext, keyResult.data, iv, tag);
      
      expect(decryptResult.success).toBe(true);
      expect(decryptResult.data.toString()).toBe('sensitive data');
    });

    it('should detect tampering with authentication tag', async () => {
      const keyResult = await generateKey(32);
      expect(keyResult.success).toBe(true);
      
      const testData = Buffer.from('sensitive data');
      const encryptResult = await encryptAES(testData, keyResult.data);
      expect(encryptResult.success).toBe(true);
      
      const { ciphertext, iv, tag } = encryptResult.data;
      // Tamper with auth tag
      tag[0] = tag[0] ^ 1;
      
      const decryptResult = await decryptAES(ciphertext, keyResult.data, iv, tag);
      expect(decryptResult.success).toBe(false);
      expect(decryptResult.error.code).toBe('DECRYPTION_ERROR');
    });

    it('should fail with invalid key length', async () => {
      const invalidKey = Buffer.alloc(16); // Wrong size for AES-256
      const testData = Buffer.from('test');
      
      const result = await encryptAES(testData, invalidKey);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'INVALID_KEY_LENGTH',
        message: 'Key must be 32 bytes for AES-256'
      });
    });
  });

  describe('hashPassword', () => {
    it('should hash password using Argon2id with secure parameters', async () => {
      const password = 'SecurePassword123!';
      const result = await hashPassword(password);
      
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^\$argon2id\$/);
      expect(result.metadata.algorithm).toBe('argon2id');
    });

    it('should generate unique hashes for identical passwords', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1.success && hash2.success).toBe(true);
      expect(hash1.data).not.toBe(hash2.data);
    });

    it('should enforce minimum password requirements', async () => {
      const weakPassword = '123';
      const result = await hashPassword(weakPassword);
      
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'INVALID_PASSWORD',
        message: 'Password must be at least 8 characters'
      });
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password against hash', async () => {
      const password = 'SecurePassword123!';
      const hashResult = await hashPassword(password);
      expect(hashResult.success).toBe(true);
      
      const verifyResult = await verifyPassword(password, hashResult.data);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'SecurePassword123!';
      const hashResult = await hashPassword(password);
      expect(hashResult.success).toBe(true);
      
      const verifyResult = await verifyPassword('WrongPassword123!', hashResult.data);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data).toBe(false);
    });

    it('should handle invalid inputs securely', async () => {
      const result = await verifyPassword('', '');
      
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: 'INVALID_INPUT',
        message: 'Password and hash are required'
      });
    });

    it('should handle malformed hash format', async () => {
      const result = await verifyPassword('password123', 'invalid-hash-format');
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VERIFICATION_ERROR');
    });
  });

  // Test memory cleanup (simulated since actual memory testing requires lower-level access)
  describe('memory handling', () => {
    it('should not leave sensitive data in results', async () => {
      const password = 'SecurePassword123!';
      const hashResult = await hashPassword(password);
      
      // Verify no plain password in result metadata
      expect(hashResult.metadata).not.toContain(password);
      expect(JSON.stringify(hashResult)).not.toContain(password);
    });
  });
});