/**
 * Service class for managing client-side storage operations with encryption,
 * caching, and type safety.
 * @packageDocumentation
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { AudioChunk, AudioFormat } from '../types/audio.types';
import { setItem, getItem, removeItem, STORAGE_KEYS } from '../utils/storage.utils';
import type { AppSettings } from '../types/settings.types';

/**
 * Configuration interface for StorageService
 */
interface StorageConfig {
  maxCacheSize: number;
  cleanupInterval: number;
  encryptionEnabled: boolean;
}

/**
 * Cache entry metadata for audio chunks
 */
interface AudioCacheEntry {
  chunk: AudioChunk;
  timestamp: number;
  size: number;
}

/**
 * Service class for managing client-side storage operations
 */
export class StorageService {
  private audioCache: Map<string, AudioCacheEntry>;
  private encryptionKey: string;
  private maxCacheSize: number;
  private currentCacheSize: number;
  private readonly storageVersion: string = '1.0.0';
  private cleanupInterval: number;

  /**
   * Creates a new instance of StorageService
   * @param encryptionKey - Key used for encrypting sensitive data
   * @param config - Storage service configuration
   */
  constructor(
    encryptionKey: string,
    config: StorageConfig = {
      maxCacheSize: 50 * 1024 * 1024, // 50MB default
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      encryptionEnabled: true
    }
  ) {
    this.audioCache = new Map();
    this.currentCacheSize = 0;
    this.encryptionKey = encryptionKey;
    this.maxCacheSize = config.maxCacheSize;
    this.cleanupInterval = config.cleanupInterval;

    // Initialize cleanup interval
    setInterval(() => this.cleanupCache(), this.cleanupInterval);
  }

  /**
   * Stores an audio chunk in temporary cache with validation
   * @param id - Unique identifier for the audio chunk
   * @param chunk - Audio chunk data to store
   * @throws Error if chunk validation fails or cache is full
   */
  public async storeAudioChunk(id: string, chunk: AudioChunk): Promise<void> {
    try {
      // Validate chunk format and data
      if (!chunk.data || !chunk.format || !Object.values(AudioFormat).includes(chunk.format)) {
        throw new Error('Invalid audio chunk format');
      }

      const chunkSize = chunk.data.byteLength;
      
      // Check if adding this chunk would exceed cache size
      if (this.currentCacheSize + chunkSize > this.maxCacheSize) {
        await this.evictOldestEntries(chunkSize);
      }

      // Store chunk with metadata
      const entry: AudioCacheEntry = {
        chunk,
        timestamp: Date.now(),
        size: chunkSize
      };

      this.audioCache.set(id, entry);
      this.currentCacheSize += chunkSize;
    } catch (error) {
      console.error('Failed to store audio chunk:', error);
      throw new Error(`Storage operation failed for chunk ${id}`);
    }
  }

  /**
   * Retrieves an audio chunk from cache with validation
   * @param id - Unique identifier for the audio chunk
   * @returns The audio chunk or null if not found
   */
  public getAudioChunk(id: string): AudioChunk | null {
    const entry = this.audioCache.get(id);
    if (!entry) return null;

    // Update access timestamp
    entry.timestamp = Date.now();
    return entry.chunk;
  }

  /**
   * Saves application settings with encryption and validation
   * @param settings - Application settings to store
   * @throws Error if settings validation or storage fails
   */
  public async saveSettings(settings: AppSettings): Promise<void> {
    try {
      // Validate settings structure
      this.validateSettings(settings);

      // Store settings with encryption
      await setItem(
        STORAGE_KEYS.SETTINGS,
        settings,
        true, // persistent storage
        true  // encrypted
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Settings storage operation failed');
    }
  }

  /**
   * Retrieves and decrypts application settings
   * @returns Decrypted settings or null if not found
   */
  public getSettings(): AppSettings | null {
    try {
      return getItem<AppSettings>(
        STORAGE_KEYS.SETTINGS,
        true // encrypted
      );
    } catch (error) {
      console.error('Failed to retrieve settings:', error);
      return null;
    }
  }

  /**
   * Removes an audio chunk from cache
   * @param id - Unique identifier for the audio chunk
   */
  public removeAudioChunk(id: string): void {
    const entry = this.audioCache.get(id);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.audioCache.delete(id);
    }
  }

  /**
   * Clears all audio chunks from cache
   */
  public clearAudioCache(): void {
    this.audioCache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Gets the current cache size in bytes
   */
  public getCurrentCacheSize(): number {
    return this.currentCacheSize;
  }

  /**
   * Validates settings object structure
   * @param settings - Settings object to validate
   * @throws Error if validation fails
   */
  private validateSettings(settings: AppSettings): void {
    const requiredFields = ['theme', 'audio', 'voice', 'language'];
    for (const field of requiredFields) {
      if (!settings[field as keyof AppSettings]) {
        throw new Error(`Missing required settings field: ${field}`);
      }
    }
  }

  /**
   * Removes oldest cache entries to make space for new data
   * @param requiredSpace - Amount of space needed in bytes
   */
  private async evictOldestEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.audioCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    for (const [id, entry] of entries) {
      if (this.currentCacheSize - freedSpace + requiredSpace <= this.maxCacheSize) {
        break;
      }
      this.removeAudioChunk(id);
      freedSpace += entry.size;
    }
  }

  /**
   * Performs periodic cleanup of expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [id, entry] of this.audioCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.removeAudioChunk(id);
      }
    }
  }
}