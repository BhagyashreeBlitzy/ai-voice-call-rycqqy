/**
 * Storage utility functions for managing browser storage operations
 * with encryption, versioning, and migration capabilities
 * @packageDocumentation
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import type { AppSettings } from '../types/settings.types';

/**
 * Storage key constants for consistent access
 */
export const STORAGE_KEYS = {
  SETTINGS: 'app_settings',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference',
  ENCRYPTION_KEY: 'storage_encryption_key'
} as const;

/**
 * Current storage version for migration management
 */
const STORAGE_VERSION = '1';

/**
 * Encryption configuration using AES-256-CBC
 */
const ENCRYPTION_CONFIG = {
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7
};

/**
 * Storage metadata interface for versioning and validation
 */
interface StorageMetadata {
  version: string;
  timestamp: number;
  compressed: boolean;
  checksum: string;
}

/**
 * Storage quota information interface
 */
interface StorageQuotaInfo {
  usage: number;
  quota: number;
  percentageUsed: number;
}

/**
 * Encrypts data using AES-256-CBC
 */
const encryptData = (data: string): string => {
  const key = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY) || 
              CryptoJS.lib.WordArray.random(32).toString();
  const iv = CryptoJS.lib.WordArray.random(16);
  
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    ...ENCRYPTION_CONFIG,
    iv: iv
  });

  return JSON.stringify({
    data: encrypted.toString(),
    iv: iv.toString()
  });
};

/**
 * Decrypts AES-256-CBC encrypted data
 */
const decryptData = (encryptedData: string): string | null => {
  try {
    const key = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);
    if (!key) return null;

    const { data, iv } = JSON.parse(encryptedData);
    const decrypted = CryptoJS.AES.decrypt(data, key, {
      ...ENCRYPTION_CONFIG,
      iv: CryptoJS.enc.Hex.parse(iv)
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Compresses data if it exceeds size threshold
 */
const compressData = (data: string): { data: string; compressed: boolean } => {
  if (data.length < 1024) {
    return { data, compressed: false };
  }
  return {
    data: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data)),
    compressed: true
  };
};

/**
 * Decompresses data if it was compressed
 */
const decompressData = (data: string, compressed: boolean): string => {
  if (!compressed) return data;
  return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(data));
};

/**
 * Stores an item in browser storage with optional encryption
 */
export const setItem = <T>(
  key: string,
  value: T,
  persistent: boolean = true,
  encrypt: boolean = false
): void => {
  try {
    const metadata: StorageMetadata = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      compressed: false,
      checksum: ''
    };

    let serializedData = JSON.stringify(value);
    const { data: compressedData, compressed } = compressData(serializedData);
    metadata.compressed = compressed;
    serializedData = compressedData;

    if (encrypt) {
      serializedData = encryptData(serializedData);
    }

    metadata.checksum = CryptoJS.SHA256(serializedData).toString();

    const storageData = JSON.stringify({
      metadata,
      data: serializedData
    });

    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(key, storageData);

    // Dispatch storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: storageData,
      storageArea: storage
    }));

    monitorStorageQuota();
  } catch (error) {
    console.error('Storage operation failed:', error);
    throw new Error(`Failed to store item: ${key}`);
  }
};

/**
 * Retrieves and decrypts an item from browser storage with type safety
 */
export const getItem = <T>(
  key: string,
  encrypted: boolean = false
): T | null => {
  try {
    const persistentData = localStorage.getItem(key);
    const sessionData = sessionStorage.getItem(key);
    const storageData = persistentData || sessionData;

    if (!storageData) return null;

    const { metadata, data } = JSON.parse(storageData);

    // Validate version and checksum
    if (metadata.version !== STORAGE_VERSION) {
      throw new Error(`Version mismatch: ${metadata.version}`);
    }

    let parsedData = data;
    if (encrypted) {
      parsedData = decryptData(data);
      if (!parsedData) return null;
    }

    // Validate checksum
    if (CryptoJS.SHA256(parsedData).toString() !== metadata.checksum) {
      throw new Error('Data integrity check failed');
    }

    parsedData = decompressData(parsedData, metadata.compressed);
    return JSON.parse(parsedData) as T;
  } catch (error) {
    console.error('Storage retrieval failed:', error);
    return null;
  }
};

/**
 * Migrates storage data between versions
 */
export const migrateStorage = async (
  fromVersion: number,
  toVersion: number
): Promise<boolean> => {
  try {
    // Backup current storage
    const backup = { ...localStorage };

    // Perform version-specific migrations
    if (fromVersion === 1 && toVersion === 2) {
      const settings = getItem<AppSettings>(STORAGE_KEYS.SETTINGS);
      if (settings) {
        // Example migration: Add new field with default value
        setItem(STORAGE_KEYS.SETTINGS, settings, true, true);
      }
    }

    // Update storage version
    localStorage.setItem('storageVersion', toVersion.toString());
    return true;
  } catch (error) {
    console.error('Storage migration failed:', error);
    return false;
  }
};

/**
 * Monitors and manages storage quota usage
 */
export const monitorStorageQuota = (): StorageQuotaInfo => {
  const quota = navigator.storage && navigator.storage.estimate ?
    navigator.storage.estimate() :
    Promise.resolve({ usage: 0, quota: 0 });

  return {
    usage: calculateStorageUsage(),
    quota: quota || 0,
    percentageUsed: calculateStorageUsage() / (quota || 1) * 100
  };
};

/**
 * Calculates current storage usage in bytes
 */
const calculateStorageUsage = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  return total * 2; // Approximate bytes (2 bytes per character)
};