/**
 * Voice Service
 * Manages voice synthesis, voice selection, and voice processing configuration
 * with real-time processing capabilities and robust error handling.
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { 
  VoiceId, 
  VoiceConfig, 
  VoiceSynthesisOptions, 
  VoiceMetadata,
  VoiceError,
  VoiceState,
  SSMLOptions
} from '../types/voice.types';
import { AudioFormat, AudioConfig } from '../types/audio.types';
import { 
  VOICE_PROCESSING_CONFIG,
  VOICE_ACTIVITY_THRESHOLDS,
  VOICE_SYNTHESIS_CONFIG,
  SUPPORTED_VOICE_IDS,
  VOICE_DISPLAY_NAMES
} from '../constants/voice.constants';
import { apiService } from './api.service';
import { API_ENDPOINTS, CONTENT_TYPES } from '../constants/api.constants';

export class VoiceService {
  private readonly eventEmitter: EventEmitter;
  private currentConfig: VoiceConfig;
  private currentVoiceId: VoiceId;
  private readonly voiceCache: Map<string, ArrayBuffer>;
  private voiceState: VoiceState;
  private readonly ssmlOptions: SSMLOptions;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.voiceCache = new Map();
    
    // Initialize default configuration
    this.currentConfig = {
      audioConfig: {
        sampleRate: VOICE_PROCESSING_CONFIG.SAMPLE_RATE,
        frameSize: VOICE_PROCESSING_CONFIG.FRAME_SIZE_MS,
        bitDepth: VOICE_PROCESSING_CONFIG.BIT_DEPTH,
        channels: VOICE_PROCESSING_CONFIG.CHANNELS
      },
      preferredFormat: AudioFormat.OPUS,
      vadEnabled: true,
      vadThreshold: VOICE_ACTIVITY_THRESHOLDS.VAD_THRESHOLD_DB,
      noiseFloor: VOICE_ACTIVITY_THRESHOLDS.NOISE_FLOOR_DB
    };

    // Set default voice
    this.currentVoiceId = VoiceId.FEMALE_1;

    // Initialize voice state
    this.voiceState = {
      isActive: false,
      isSpeaking: false,
      currentVoiceId: this.currentVoiceId,
      isProcessing: false,
      error: null
    };

    // Configure SSML options
    this.ssmlOptions = {
      enabled: VOICE_SYNTHESIS_CONFIG.SSML_ENABLED,
      supportedTags: VOICE_SYNTHESIS_CONFIG.SUPPORTED_SSML_TAGS,
      markers: {}
    };

    this.setupErrorHandling();
  }

  /**
   * Retrieves list of available voices with metadata
   */
  public async getAvailableVoices(): Promise<VoiceMetadata[]> {
    try {
      const response = await apiService.get<VoiceMetadata[]>(API_ENDPOINTS.VOICES.LIST);
      return response.map(voice => ({
        ...voice,
        name: VOICE_DISPLAY_NAMES[voice.voiceId],
        supportedFeatures: this.getSupportedFeatures(voice.voiceId)
      }));
    } catch (error) {
      this.handleError('VOICE_LIST_ERROR', 'Failed to retrieve voice list', error);
      return [];
    }
  }

  /**
   * Sets the active voice for synthesis
   */
  public async setVoice(voiceId: VoiceId): Promise<void> {
    try {
      // Validate voice ID
      if (!SUPPORTED_VOICE_IDS[voiceId]) {
        throw new Error(`Unsupported voice ID: ${voiceId}`);
      }

      // Update voice state
      this.currentVoiceId = voiceId;
      this.voiceState.currentVoiceId = voiceId;
      
      // Clear cache for new voice
      this.voiceCache.clear();

      // Update backend preference
      await apiService.put(API_ENDPOINTS.VOICES.SETTINGS, {
        voiceId,
        config: this.currentConfig
      });

      this.eventEmitter.emit('voiceChanged', { voiceId });
    } catch (error) {
      this.handleError('VOICE_SET_ERROR', 'Failed to set voice', error);
    }
  }

  /**
   * Synthesizes speech from text with SSML support
   */
  public async synthesizeSpeech(
    text: string, 
    options: Partial<VoiceSynthesisOptions> = {}
  ): Promise<ArrayBuffer> {
    try {
      this.voiceState.isProcessing = true;
      
      // Check cache for frequent phrases
      const cacheKey = `${this.currentVoiceId}:${text}:${JSON.stringify(options)}`;
      const cachedAudio = this.voiceCache.get(cacheKey);
      if (cachedAudio) {
        return cachedAudio;
      }

      // Prepare synthesis options
      const synthesisOptions: VoiceSynthesisOptions = {
        voiceId: this.currentVoiceId,
        speakingRate: options.speakingRate ?? VOICE_SYNTHESIS_CONFIG.DEFAULT_RATE,
        pitch: options.pitch ?? VOICE_SYNTHESIS_CONFIG.DEFAULT_PITCH,
        volume: options.volume ?? VOICE_SYNTHESIS_CONFIG.DEFAULT_VOLUME
      };

      // Process SSML if enabled
      const processedText = this.ssmlOptions.enabled 
        ? this.processSSML(text) 
        : text;

      // Request synthesis
      const response = await apiService.post<ArrayBuffer>(
        API_ENDPOINTS.VOICES.GET.replace(':id', this.currentVoiceId),
        {
          text: processedText,
          options: synthesisOptions
        },
        {
          responseType: 'arraybuffer',
          headers: {
            'Content-Type': CONTENT_TYPES.JSON,
            'Accept': CONTENT_TYPES.AUDIO_OPUS
          }
        }
      );

      // Cache result for frequent phrases
      if (text.length < 100) { // Only cache short phrases
        this.voiceCache.set(cacheKey, response);
      }

      return response;
    } catch (error) {
      this.handleError('SYNTHESIS_ERROR', 'Speech synthesis failed', error);
      throw error;
    } finally {
      this.voiceState.isProcessing = false;
    }
  }

  /**
   * Updates voice processing configuration
   */
  public updateVoiceConfig(config: Partial<VoiceConfig>): void {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Merge with current config
      this.currentConfig = {
        ...this.currentConfig,
        ...config,
        audioConfig: {
          ...this.currentConfig.audioConfig,
          ...config.audioConfig
        }
      };

      this.eventEmitter.emit('configUpdated', this.currentConfig);
    } catch (error) {
      this.handleError('CONFIG_UPDATE_ERROR', 'Failed to update configuration', error);
    }
  }

  /**
   * Adds event listener for voice service events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Removes event listener
   */
  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Gets current voice state
   */
  public getVoiceState(): VoiceState {
    return { ...this.voiceState };
  }

  private validateConfig(config: Partial<VoiceConfig>): void {
    if (config.vadThreshold && 
        (config.vadThreshold > 0 || config.vadThreshold < -60)) {
      throw new Error('VAD threshold must be between -60 and 0 dB');
    }

    if (config.audioConfig?.sampleRate && 
        ![8000, 16000, 44100, 48000].includes(config.audioConfig.sampleRate)) {
      throw new Error('Invalid sample rate');
    }
  }

  private processSSML(text: string): string {
    if (!this.ssmlOptions.enabled) return text;
    
    let processedText = `<speak>${text}</speak>`;
    // Apply SSML transformations based on supported tags
    for (const tag of this.ssmlOptions.supportedTags) {
      // Process each supported SSML tag
      processedText = this.applySSMLTag(processedText, tag);
    }
    
    return processedText;
  }

  private applySSMLTag(text: string, tag: string): string {
    // Implementation of SSML tag processing
    return text;
  }

  private getSupportedFeatures(voiceId: VoiceId): string[] {
    return VOICE_SYNTHESIS_CONFIG.SUPPORTED_SSML_TAGS;
  }

  private setupErrorHandling(): void {
    this.eventEmitter.on('error', (error: VoiceError) => {
      this.voiceState.error = error;
      console.error('Voice Service Error:', error);
    });
  }

  private handleError(code: string, message: string, error: any): void {
    const voiceError: VoiceError = {
      code,
      message,
      details: error instanceof Error ? { message: error.message } : error
    };
    this.eventEmitter.emit('error', voiceError);
  }
}

export const voiceService = new VoiceService();