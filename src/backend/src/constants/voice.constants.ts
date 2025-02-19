/**
 * Voice processing and synthesis constants
 * @version 1.0.0
 */

/**
 * Voice identifiers for speech synthesis services
 * Maps internal voice IDs to service-specific identifiers
 */
export const VOICE_IDS = {
  MALE_1: 'en-US-Standard-B',
  FEMALE_1: 'en-US-Standard-C',
  MALE_2: 'en-US-Standard-D',
  FEMALE_2: 'en-US-Standard-E',
  MALE_GB_1: 'en-GB-Standard-B',
  FEMALE_GB_1: 'en-GB-Standard-A'
} as const;

/**
 * Human-readable names for voice options displayed in the UI
 */
export const VOICE_NAMES = {
  MALE_1: 'Male Voice 1',
  FEMALE_1: 'Female Voice 1',
  MALE_2: 'Male Voice 2',
  FEMALE_2: 'Female Voice 2',
  MALE_GB_1: 'British Male Voice',
  FEMALE_GB_1: 'British Female Voice'
} as const;

/**
 * Audio processing configuration parameters
 * Based on WebRTC and speech recognition requirements
 */
export const AUDIO_PROCESSING = {
  SAMPLE_RATE: 16000, // Hz
  CHANNELS: 1, // Mono audio
  FRAME_SIZE: 20, // Milliseconds
  BIT_DEPTH: 16 // Bits
} as const;

/**
 * Voice activity detection parameters
 * Thresholds and timing configurations for speech detection
 */
export const VOICE_ACTIVITY = {
  VAD_THRESHOLD: -26, // dB
  NOISE_FLOOR: -45, // dB
  SILENCE_TIMEOUT: 1500, // ms
  MIN_SPEECH_DURATION: 100, // ms
  MAX_SPEECH_DURATION: 30000, // ms
  ENERGY_THRESHOLD: 0.0005, // RMS energy threshold
  SPEECH_PADDING: 200 // ms of padding around speech segments
} as const;

/**
 * Supported audio formats for speech synthesis
 * Includes codec-specific configuration parameters
 */
export const SYNTHESIS_FORMATS = {
  OPUS: {
    codec: 'opus',
    bitrate: 32000, // bps
    sampleRate: 48000 // Hz
  },
  PCM: {
    codec: 'pcm',
    bitDepth: 16,
    sampleRate: 16000 // Hz
  },
  MP3: {
    codec: 'mp3',
    bitrate: 128000, // bps
    sampleRate: 44100 // Hz
  },
  AAC: {
    codec: 'aac',
    bitrate: 64000, // bps
    sampleRate: 44100 // Hz
  }
} as const;

/**
 * Supported languages for voice synthesis
 * Includes language codes and fallback options
 */
export const VOICE_LANGUAGES = {
  EN_US: {
    code: 'en-US',
    name: 'English (United States)',
    fallback: 'en-GB'
  },
  EN_GB: {
    code: 'en-GB',
    name: 'English (United Kingdom)',
    fallback: 'en-US'
  }
} as const;

/**
 * SSML tag definitions for speech synthesis markup
 * Includes supported tags and their attributes
 */
export const SSML_TAGS = {
  SPEAK: {
    tag: 'speak',
    attributes: ['version', 'xml:lang']
  },
  VOICE: {
    tag: 'voice',
    attributes: ['name', 'language', 'gender']
  },
  BREAK: {
    tag: 'break',
    attributes: ['time', 'strength']
  },
  PROSODY: {
    tag: 'prosody',
    attributes: ['rate', 'pitch', 'volume']
  },
  EMPHASIS: {
    tag: 'emphasis',
    attributes: ['level']
  },
  SAYAS: {
    tag: 'say-as',
    attributes: ['interpret-as', 'format']
  },
  AUDIO: {
    tag: 'audio',
    attributes: ['src']
  },
  MARK: {
    tag: 'mark',
    attributes: ['name']
  }
} as const;