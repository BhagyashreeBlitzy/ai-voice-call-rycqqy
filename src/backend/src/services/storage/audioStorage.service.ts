import { S3, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { AudioChunk, AudioFormat } from '../../types/audio.types';
import { Result, UUID } from '../../types/common.types';
import { prisma } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for S3 client configuration
 * @version 1.0.0
 */
interface S3ClientConfig {
  region: string;
  bucketName: string;
  endpoint?: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * Interface for encryption configuration
 */
interface CryptoConfig {
  algorithm: string;
  keySize: number;
  ivLength: number;
}

/**
 * Interface for cleanup operation statistics
 */
interface CleanupStats {
  filesDeleted: number;
  bytesFreed: number;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Enhanced service for secure audio file storage operations
 * Implements AES-256-GCM encryption and comprehensive audit logging
 */
export class AudioStorageService {
  private readonly s3Client: S3;
  private readonly bucketName: string;
  private readonly algorithm: string;
  private readonly keySize: number;
  private readonly ivLength: number;

  constructor(
    private readonly config: S3ClientConfig,
    private readonly cryptoConfig: CryptoConfig = {
      algorithm: 'aes-256-gcm',
      keySize: 32,
      ivLength: 16
    }
  ) {
    this.s3Client = new S3({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
      maxAttempts: 3
    });
    this.bucketName = config.bucketName;
    this.algorithm = cryptoConfig.algorithm;
    this.keySize = cryptoConfig.keySize;
    this.ivLength = cryptoConfig.ivLength;
  }

  /**
   * Stores an encrypted audio chunk with comprehensive metadata
   * @param chunk - Audio chunk to store
   * @param sessionId - Associated session ID
   * @returns Promise with storage path
   */
  async storeAudioChunk(chunk: AudioChunk, sessionId: string): Promise<Result<string>> {
    try {
      // Generate unique file path
      const fileId = uuidv4();
      const filePath = `audio/${sessionId}/${fileId}.encrypted`;

      // Generate encryption parameters
      const key = randomBytes(this.keySize);
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt audio data
      const encryptedData = Buffer.concat([
        cipher.update(chunk.data),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag();

      // Prepare metadata
      const metadata = {
        format: chunk.format,
        duration: chunk.duration.toString(),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encryptionKey: key.toString('hex'),
        sessionId
      };

      // Upload to S3 with metadata
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
        Body: encryptedData,
        Metadata: metadata,
        ContentType: 'application/octet-stream',
        ServerSideEncryption: 'AES256'
      }));

      // Create database record within transaction
      await prisma.$transaction(async (tx) => {
        await tx.audioRecording.create({
          data: {
            id: fileId as UUID,
            storagePath: filePath,
            format: chunk.format,
            duration: chunk.duration,
            sessionId: sessionId as UUID,
            metadata: metadata
          }
        });

        await tx.auditLog.create({
          data: {
            action: 'STORE_AUDIO',
            resourceId: fileId,
            sessionId,
            metadata: {
              filePath,
              format: chunk.format,
              timestamp: new Date().toISOString()
            }
          }
        });
      });

      return {
        success: true,
        data: filePath,
        error: null,
        metadata: { fileId }
      };
    } catch (error) {
      return {
        success: false,
        data: '',
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to store audio chunk',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Retrieves an audio file with temporary signed URL
   * @param filePath - Path to the audio file
   * @param expiresIn - URL expiration in seconds
   */
  async getAudioFile(filePath: string, expiresIn: number = 300): Promise<Result<string>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      await prisma.auditLog.create({
        data: {
          action: 'ACCESS_AUDIO',
          resourceId: filePath,
          metadata: {
            accessType: 'SIGNED_URL',
            expiresIn,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        data: signedUrl,
        error: null,
        metadata: { expiresIn }
      };
    } catch (error) {
      return {
        success: false,
        data: '',
        error: {
          code: 'RETRIEVAL_ERROR',
          message: 'Failed to generate signed URL',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Deletes an audio file with audit logging
   * @param filePath - Path to the audio file
   */
  async deleteAudioFile(filePath: string): Promise<Result<boolean>> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filePath
      }));

      await prisma.$transaction(async (tx) => {
        await tx.audioRecording.deleteMany({
          where: { storagePath: filePath }
        });

        await tx.auditLog.create({
          data: {
            action: 'DELETE_AUDIO',
            resourceId: filePath,
            metadata: {
              timestamp: new Date().toISOString()
            }
          }
        });
      });

      return {
        success: true,
        data: true,
        error: null,
        metadata: { filePath }
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: {
          code: 'DELETION_ERROR',
          message: 'Failed to delete audio file',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }

  /**
   * Cleans up expired audio files based on retention policy
   * @param retentionDays - Number of days to retain files
   * @param forceCascade - Force deletion of referenced files
   */
  async cleanupExpiredFiles(retentionDays: number, forceCascade: boolean = false): Promise<Result<CleanupStats>> {
    const stats: CleanupStats = {
      filesDeleted: 0,
      bytesFreed: 0,
      errors: []
    };

    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - retentionDays);

      const expiredRecordings = await prisma.audioRecording.findMany({
        where: {
          createdAt: {
            lt: expirationDate
          }
        },
        select: {
          id: true,
          storagePath: true
        }
      });

      for (const recording of expiredRecordings) {
        try {
          const deleteResult = await this.deleteAudioFile(recording.storagePath);
          if (deleteResult.success) {
            stats.filesDeleted++;
          } else {
            stats.errors.push({
              path: recording.storagePath,
              error: deleteResult.error?.message || 'Unknown error'
            });
          }
        } catch (error) {
          stats.errors.push({
            path: recording.storagePath,
            error: error.message
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          action: 'CLEANUP_AUDIO',
          metadata: {
            retentionDays,
            filesDeleted: stats.filesDeleted,
            errors: stats.errors,
            timestamp: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        data: stats,
        error: null,
        metadata: { retentionDays }
      };
    } catch (error) {
      return {
        success: false,
        data: stats,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup expired files',
          details: { error: error.message },
          timestamp: Date.now()
        },
        metadata: {}
      };
    }
  }
}