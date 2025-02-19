/**
 * Central Configuration Module
 * Aggregates, validates, and securely exports all configuration settings
 * for the AI Voice Agent backend.
 * @version 1.0.0
 */

import { config as dotenv } from 'dotenv'; // ^16.3.1
import winston from 'winston'; // ^3.11.0
import crypto from 'crypto'; // latest

// Import configuration modules
import { authConfig } from './auth.config';
import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { speechConfig } from './speech.config';
import { websocketConfig } from './websocket.config';

// Initialize environment variables
dotenv();

// Encryption key for sensitive configuration values
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('CONFIG_ENCRYPTION_KEY must be at least 32 characters long');
}

/**
 * Encrypts sensitive configuration values
 * @param value Value to encrypt
 * @returns Encrypted value
 */
const encryptValue = (value: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
};

/**
 * Validates all configuration settings for security and consistency
 * @throws Error if validation fails
 */
export const validateConfigurations = (): void => {
  // Environment validation
  if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV must be set');
  }

  // Validate sensitive values are encrypted in production
  if (process.env.NODE_ENV === 'production') {
    const sensitiveFields = [
      authConfig.jwtSecret,
      databaseConfig.password,
      redisConfig.password
    ];

    sensitiveFields.forEach(field => {
      if (field && !field.includes(':')) {
        throw new Error('Sensitive configuration values must be encrypted in production');
      }
    });
  }

  // Validate configuration dependencies
  if (speechConfig.sampleRate !== 16000) {
    throw new Error('Speech sample rate must be 16kHz per technical specifications');
  }

  if (websocketConfig.maxPayloadSize < 65536) {
    throw new Error('WebSocket payload size must be at least 64KB for voice data');
  }
};

/**
 * Monitors configuration changes and logs significant updates
 */
export const monitorConfigChanges = (): void => {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'config-changes.log' })
    ]
  });

  // Log configuration state on startup
  logger.info('Configuration initialized', {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    configs: {
      auth: { ...authConfig, jwtSecret: '[REDACTED]' },
      database: { ...databaseConfig, password: '[REDACTED]' },
      redis: { ...redisConfig, password: '[REDACTED]' },
      speech: speechConfig,
      websocket: websocketConfig
    }
  });
};

/**
 * Consolidated configuration object with all settings
 */
export const config = {
  environment: process.env.NODE_ENV || 'development',
  
  auth: {
    ...authConfig,
    jwtSecret: process.env.NODE_ENV === 'production' 
      ? encryptValue(authConfig.jwtSecret)
      : authConfig.jwtSecret
  },

  database: {
    ...databaseConfig,
    password: process.env.NODE_ENV === 'production'
      ? encryptValue(databaseConfig.password)
      : databaseConfig.password
  },

  redis: {
    ...redisConfig,
    password: process.env.NODE_ENV === 'production'
      ? encryptValue(redisConfig.password)
      : redisConfig.password
  },

  speech: {
    ...speechConfig,
    // Speech config doesn't contain sensitive data
  },

  websocket: {
    ...websocketConfig,
    // WebSocket config doesn't contain sensitive data
  }
};

// Validate configurations on module load
validateConfigurations();

// Initialize configuration monitoring
monitorConfigChanges();

export default config;