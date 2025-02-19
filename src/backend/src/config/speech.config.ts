/**
 * Speech Configuration Module
 * Manages speech recognition and synthesis settings including audio parameters,
 * voice activity detection, and speech service integration.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.3.1
import { SpeechConfig } from '../types/config.types';
import { AUDIO_PROCESSING, VOICE_ACTIVITY } from '../constants/voice.constants';

// Initialize environment variables
config();

// Environment-specific configuration cache
let cachedConfig: SpeechConfig | null = null;

/**
 * Speech service credentials and environment variables
 */
const CREDENTIALS = {
  googleSpeech: process.env.GOOGLE_SPEECH_API_KEY,
  awsPolly: {
    accessKey: process.env.AWS_POLLY_ACCESS_KEY,
    secretKey: process.env.AWS_POLLY_SECRET_KEY
  }
};

/**
 * Default speech configuration based on technical specifications
 */
const DEFAULT_CONFIG: SpeechConfig = {
  sampleRate: AUDIO_PROCESSING.SAMPLE_RATE, // 16kHz as per specs
  encoding: 'LINEAR16', // 16-bit PCM
  languageCode: 'en-US',
  vadThreshold: VOICE_ACTIVITY.VAD_THRESHOLD, // -26dB as per specs
  noiseFloor: VOICE_ACTIVITY.NOISE_FLOOR, // -45dB as per specs
  frameSize: AUDIO_PROCESSING.FRAME_SIZE, // 20ms as per specs
  bitDepth: AUDIO_PROCESSING.BIT_DEPTH, // 16-bit as per specs
  latencyBudget: 500 // 500ms maximum acceptable processing delay
};

/**
 * Environment-specific configuration overrides
 */
const ENVIRONMENT_OVERRIDES: Record<string, Partial<SpeechConfig>> = {
  development: {
    // Development-specific overrides if needed
  },
  production: {
    // Stricter settings for production
    latencyBudget: 300, // Reduced latency budget for production
  },
  test: {
    // Test environment settings
    vadThreshold: -30, // More lenient VAD for testing
  }
};

/**
 * Validates speech configuration parameters against defined schemas
 * @param config Partial speech configuration to validate
 * @throws Error if configuration is invalid
 */
export const validateSpeechConfig = (config: Partial<SpeechConfig>): boolean => {
  // Required parameters check
  const requiredParams = [
    'sampleRate',
    'encoding',
    'languageCode',
    'vadThreshold',
    'noiseFloor',
    'frameSize',
    'bitDepth'
  ];

  for (const param of requiredParams) {
    if (config[param] === undefined) {
      throw new Error(`Missing required parameter: ${param}`);
    }
  }

  // Parameter range validation
  if (config.sampleRate !== 16000) {
    throw new Error('Sample rate must be 16kHz for speech recognition');
  }

  if (config.bitDepth !== 16) {
    throw new Error('Bit depth must be 16-bit for speech recognition');
  }

  if (config.frameSize < 10 || config.frameSize > 100) {
    throw new Error('Frame size must be between 10ms and 100ms');
  }

  if (config.vadThreshold > -20 || config.vadThreshold < -40) {
    throw new Error('VAD threshold must be between -40dB and -20dB');
  }

  if (config.noiseFloor > -30 || config.noiseFloor < -60) {
    throw new Error('Noise floor must be between -60dB and -30dB');
  }

  if (config.latencyBudget > 1000 || config.latencyBudget < 100) {
    throw new Error('Latency budget must be between 100ms and 1000ms');
  }

  return true;
};

/**
 * Retrieves and validates the speech configuration settings
 * with environment-specific overrides
 */
export const getSpeechConfig = (): SpeechConfig => {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Validate credentials
  if (!CREDENTIALS.googleSpeech) {
    throw new Error('Missing Google Speech API credentials');
  }
  if (!CREDENTIALS.awsPolly.accessKey || !CREDENTIALS.awsPolly.secretKey) {
    throw new Error('Missing AWS Polly credentials');
  }

  // Get current environment
  const environment = process.env.NODE_ENV || 'development';

  // Merge default config with environment-specific overrides
  const config: SpeechConfig = {
    ...DEFAULT_CONFIG,
    ...ENVIRONMENT_OVERRIDES[environment]
  };

  // Validate merged configuration
  validateSpeechConfig(config);

  // Cache the validated configuration
  cachedConfig = config;

  return config;
};

/**
 * Exported speech configuration object with all parameters
 * and service-specific settings
 */
export const speechConfig = {
  ...getSpeechConfig(),
  googleSpeechConfig: {
    apiKey: CREDENTIALS.googleSpeech,
    encoding: DEFAULT_CONFIG.encoding,
    sampleRateHertz: DEFAULT_CONFIG.sampleRate,
    languageCode: DEFAULT_CONFIG.languageCode,
    enableAutomaticPunctuation: true,
    model: 'latest_long',
  },
  awsPollyConfig: {
    accessKeyId: CREDENTIALS.awsPolly.accessKey,
    secretAccessKey: CREDENTIALS.awsPolly.secretKey,
    region: 'us-east-1',
    engine: 'neural',
    outputFormat: 'pcm',
    sampleRate: DEFAULT_CONFIG.sampleRate.toString(),
  }
};