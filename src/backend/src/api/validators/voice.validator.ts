/**
 * Voice-related request validation schemas and functions
 * Implements comprehensive validation for voice configuration, synthesis options,
 * and SSML input with strict security controls
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { validateSchema } from '../../utils/validation.utils';
import { VoiceConfig, VoiceSynthesisOptions } from '../../interfaces/voice.interface';
import { VOICE_IDS, AUDIO_PROCESSING, VOICE_ACTIVITY, SYNTHESIS_FORMATS, SSML_TAGS } from '../../constants/voice.constants';
import { Result } from '../../types/common.types';
import { AudioFormat } from '../../types/audio.types';

// Voice configuration validation schema
const voiceConfigSchema = Joi.object({
  audioConfig: Joi.object({
    sampleRate: Joi.number()
      .valid(8000, 16000, 24000, 44100, 48000)
      .default(AUDIO_PROCESSING.SAMPLE_RATE)
      .required(),
    frameSize: Joi.number()
      .min(10)
      .max(60)
      .default(AUDIO_PROCESSING.FRAME_SIZE)
      .required(),
    bitDepth: Joi.number()
      .valid(16, 24, 32)
      .default(AUDIO_PROCESSING.BIT_DEPTH)
      .required(),
    channels: Joi.number()
      .valid(1, 2)
      .default(AUDIO_PROCESSING.CHANNELS)
      .required(),
    latencyBudget: Joi.number()
      .min(100)
      .max(1000)
      .default(500)
      .required()
  }).required(),
  preferredFormat: Joi.string()
    .valid(...Object.values(AudioFormat))
    .default(AudioFormat.OPUS)
    .required(),
  vadEnabled: Joi.boolean().default(true),
  vadThreshold: Joi.number()
    .min(-60)
    .max(0)
    .default(VOICE_ACTIVITY.VAD_THRESHOLD),
  noiseFloor: Joi.number()
    .min(-80)
    .max(-20)
    .default(VOICE_ACTIVITY.NOISE_FLOOR),
  noiseCancellation: Joi.boolean().default(true)
}).required();

// Voice synthesis options validation schema
const synthesisOptionsSchema = Joi.object({
  voiceId: Joi.string()
    .valid(...Object.values(VOICE_IDS))
    .required(),
  rate: Joi.number()
    .min(0.5)
    .max(2.0)
    .default(1.0),
  pitch: Joi.number()
    .min(-20)
    .max(20)
    .default(0),
  volume: Joi.number()
    .min(0)
    .max(100)
    .default(100),
  languageCode: Joi.string()
    .pattern(/^[a-z]{2}-[A-Z]{2}$/)
    .required(),
  ssmlEnabled: Joi.boolean().default(false),
  effectsProfile: Joi.array()
    .items(Joi.string().valid('telephony', 'studio', 'default'))
    .default(['default'])
}).required();

// SSML validation schema with security controls
const ssmlSchema = Joi.object({
  ssml: Joi.string()
    .pattern(new RegExp(`^<speak[^>]*>.*</speak>$`, 's'))
    .custom((value: string, helpers) => {
      // Validate allowed SSML tags and attributes
      const allowedTags = Object.values(SSML_TAGS).map(t => t.tag);
      const tagRegex = new RegExp(`<(?!\/?(${allowedTags.join('|')})\b)[^>]+>`, 'g');
      
      if (tagRegex.test(value)) {
        return helpers.error('ssml.invalidTags');
      }

      // Check for potentially malicious content
      const securityRegex = /(<script|javascript:|data:|vbscript:)/i;
      if (securityRegex.test(value)) {
        return helpers.error('ssml.security');
      }

      return value;
    })
    .required()
}).required();

/**
 * Validates voice configuration parameters
 * @param config Voice configuration object to validate
 * @returns Validation result with detailed error context
 */
export const validateVoiceConfig = (config: VoiceConfig): Result<boolean> => {
  return validateSchema<boolean>(config, voiceConfigSchema);
};

/**
 * Validates voice synthesis options
 * @param options Synthesis options to validate
 * @returns Validation result with synthesis parameter validation status
 */
export const validateSynthesisOptions = (options: VoiceSynthesisOptions): Result<boolean> => {
  return validateSchema<boolean>(options, synthesisOptionsSchema);
};

/**
 * Validates SSML input with security focus
 * @param ssml SSML string to validate
 * @returns Validation result with SSML validation details
 */
export const validateSSMLInput = (ssml: string): Result<boolean> => {
  return validateSchema<boolean>({ ssml }, ssmlSchema);
};

/**
 * Validates audio format compatibility
 * @param format Audio format to validate
 * @returns Validation result with format compatibility status
 */
export const validateAudioFormat = (format: AudioFormat): Result<boolean> => {
  const formatSchema = Joi.string()
    .valid(...Object.values(AudioFormat))
    .required();

  return validateSchema<boolean>(format, formatSchema);
};

/**
 * Validates voice processing parameters
 * @param params Voice processing parameters to validate
 * @returns Validation result with processing parameter validation status
 */
export const validateProcessingParams = (params: {
  sampleRate: number;
  frameSize: number;
  vadThreshold: number;
}): Result<boolean> => {
  const processingSchema = Joi.object({
    sampleRate: Joi.number()
      .valid(...Object.keys(SYNTHESIS_FORMATS).map(f => SYNTHESIS_FORMATS[f].sampleRate))
      .required(),
    frameSize: Joi.number()
      .min(10)
      .max(60)
      .required(),
    vadThreshold: Joi.number()
      .min(-60)
      .max(0)
      .required()
  }).required();

  return validateSchema<boolean>(params, processingSchema);
};