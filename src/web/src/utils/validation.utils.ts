/**
 * Validation utilities for data structures and configurations
 * Implements comprehensive schema validation with enhanced security controls
 * @packageDocumentation
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import type { AudioConfig } from '../types/audio.types';
import type { Message } from '../types/conversation.types';
import type { AppSettings } from '../types/settings.types';

/**
 * Schema for validating audio configuration parameters
 */
const audioConfigSchema = z.object({
  sampleRate: z.number().exactly(16000).describe('Sample rate must be exactly 16kHz'),
  frameSize: z.number().exactly(20).describe('Frame size must be exactly 20ms'),
  bitDepth: z.number().exactly(16).describe('Bit depth must be exactly 16-bit'),
  channels: z.number().min(1).max(2).describe('Channels must be 1 (mono) or 2 (stereo)')
});

/**
 * Schema for validating message content with security controls
 */
const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(4000, 'Message content exceeds maximum length')
    .transform(str => sanitizeInput(str)),
  role: z.enum(['user', 'ai', 'system']),
  timestamp: z.number()
    .min(Date.now() - 86400000) // Not older than 24 hours
    .max(Date.now() + 1000) // Not in the future (with 1s tolerance)
});

/**
 * Schema for validating application settings
 */
const settingsSchema = z.object({
  theme: z.object({
    mode: z.enum(['light', 'dark', 'system']),
    useSystemPreference: z.boolean()
  }),
  audio: z.object({
    inputVolume: z.number().min(0).max(100),
    outputVolume: z.number().min(0).max(100),
    noiseReduction: z.boolean(),
    config: audioConfigSchema,
    latencyBudget: z.number().min(100).max(1000)
  }),
  language: z.object({
    primaryLanguage: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
    secondaryLanguage: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
    useSystemLanguage: z.boolean(),
    rtlSupport: z.boolean()
  })
});

/**
 * Validates audio configuration parameters against required specifications
 * @param config - Audio configuration to validate
 * @throws {ValidationError} If configuration is invalid
 */
export function validateAudioConfig(config: AudioConfig): boolean {
  try {
    audioConfigSchema.parse(config);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid audio configuration', {
        context: 'AudioConfig',
        errors: error.errors,
        config
      });
    }
    throw error;
  }
}

/**
 * Validates and sanitizes message content with enhanced security checks
 * @param message - Message to validate
 * @throws {ValidationError} If message is invalid
 */
export function validateMessage(message: Message): boolean {
  try {
    messageSchema.parse(message);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid message', {
        context: 'Message',
        errors: error.errors,
        message
      });
    }
    throw error;
  }
}

/**
 * Validates user settings with comprehensive type and range checking
 * @param settings - Settings to validate
 * @throws {ValidationError} If settings are invalid
 */
export function validateSettings(settings: AppSettings): boolean {
  try {
    settingsSchema.parse(settings);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid settings', {
        context: 'AppSettings',
        errors: error.errors,
        settings
      });
    }
    throw error;
  }
}

/**
 * Enhanced input sanitization with comprehensive security controls
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Remove potential script injection patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+=/gi, '');
  
  // Trim excessive whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  return sanitized;
}

/**
 * Custom validation error with enhanced context
 */
class ValidationError extends Error {
  constructor(
    message: string,
    public details: {
      context: string;
      errors: z.ZodError['errors'];
      [key: string]: unknown;
    }
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}