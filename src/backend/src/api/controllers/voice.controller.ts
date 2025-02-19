/**
 * Voice Controller
 * Handles voice-related HTTP endpoints including voice configuration,
 * synthesis options, and voice selection with caching and error handling.
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { SpeechSynthesisService } from '../../services/audio/speechSynthesis.service';
import { VoiceConfig, VoiceSynthesisOptions, VoiceMetadata } from '../../interfaces/voice.interface';
import { AudioFormat } from '../../types/audio.types';
import { HttpStatusCode } from '../../types/common.types';
import { VOICE_IDS, VOICE_NAMES, VOICE_LANGUAGES, SYNTHESIS_FORMATS } from '../../constants/voice.constants';
import { speechConfig } from '../../config/speech.config';

/**
 * Controller for handling voice-related endpoints
 * Implements caching and comprehensive error handling
 */
export class VoiceController {
  private readonly speechSynthesisService: SpeechSynthesisService;
  private readonly voiceCache: Map<string, VoiceMetadata>;
  private readonly cacheDuration: number = 3600000; // 1 hour in milliseconds

  constructor(speechSynthesisService: SpeechSynthesisService) {
    this.speechSynthesisService = speechSynthesisService;
    this.voiceCache = new Map();
  }

  /**
   * Retrieves available voices with metadata
   * @param req Express request
   * @param res Express response
   */
  public async getAvailableVoices(req: Request, res: Response): Promise<void> {
    try {
      const voices: VoiceMetadata[] = [];
      
      // Check cache first
      if (this.voiceCache.size > 0 && 
          Date.now() - this.voiceCache.values().next().value.timestamp < this.cacheDuration) {
        res.status(HttpStatusCode.OK).json({
          success: true,
          data: Array.from(this.voiceCache.values())
        });
        return;
      }

      // Build voice metadata
      for (const [id, serviceId] of Object.entries(VOICE_IDS)) {
        const language = VOICE_LANGUAGES[id.split('_')[0] + '_' + id.split('_')[1]];
        const metadata: VoiceMetadata = {
          voiceId: serviceId,
          name: VOICE_NAMES[id],
          language: language.code,
          gender: id.includes('MALE') ? 'male' : 'female',
          supportedEffects: ['telephony', 'studio'],
          sampleRate: SYNTHESIS_FORMATS.PCM.sampleRate,
          codecSupport: [AudioFormat.OPUS, AudioFormat.PCM, AudioFormat.AAC]
        };
        voices.push(metadata);
        this.voiceCache.set(serviceId, { ...metadata, timestamp: Date.now() });
      }

      res.status(HttpStatusCode.OK).json({
        success: true,
        data: voices
      });
    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'VOICE_LIST_ERROR',
          message: 'Failed to retrieve voice list',
          details: error.message
        }
      });
    }
  }

  /**
   * Synthesizes text to speech
   * @param req Express request with synthesis options
   * @param res Express response
   */
  public async synthesizeText(req: Request, res: Response): Promise<void> {
    try {
      const { text, options } = req.body as { 
        text: string; 
        options: VoiceSynthesisOptions 
      };

      // Validate input
      if (!text || !options?.voiceId) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required parameters',
            details: 'Text and voiceId are required'
          }
        });
        return;
      }

      // Validate and normalize options
      const normalizedOptions: VoiceSynthesisOptions = {
        voiceId: options.voiceId,
        rate: Math.max(0.5, Math.min(options.rate || 1.0, 2.0)),
        pitch: Math.max(-20, Math.min(options.pitch || 0, 20)),
        volume: Math.max(0, Math.min(options.volume || 100, 100)),
        languageCode: options.languageCode || speechConfig.languageCode,
        ssmlEnabled: false,
        effectsProfile: options.effectsProfile || []
      };

      // Synthesize speech
      const audioBuffer = await this.speechSynthesisService.synthesizeSpeech(
        text,
        normalizedOptions
      );

      // Convert format if requested
      const targetFormat = req.query.format as AudioFormat;
      if (targetFormat && targetFormat !== AudioFormat.PCM) {
        const convertedBuffer = await this.speechSynthesisService.convertFormat(
          audioBuffer,
          targetFormat
        );
        
        res.set({
          'Content-Type': targetFormat,
          'Content-Length': convertedBuffer.length
        }).send(convertedBuffer);
        return;
      }

      // Send PCM audio
      res.set({
        'Content-Type': AudioFormat.PCM,
        'Content-Length': audioBuffer.length
      }).send(audioBuffer);

    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'SYNTHESIS_ERROR',
          message: 'Speech synthesis failed',
          details: error.message
        }
      });
    }
  }

  /**
   * Synthesizes SSML to speech
   * @param req Express request with SSML and options
   * @param res Express response
   */
  public async synthesizeSSML(req: Request, res: Response): Promise<void> {
    try {
      const { ssml, options } = req.body as {
        ssml: string;
        options: VoiceSynthesisOptions
      };

      // Validate input
      if (!ssml || !options?.voiceId) {
        res.status(HttpStatusCode.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required parameters',
            details: 'SSML and voiceId are required'
          }
        });
        return;
      }

      // Normalize options
      const normalizedOptions: VoiceSynthesisOptions = {
        ...options,
        ssmlEnabled: true
      };

      // Synthesize SSML
      const audioBuffer = await this.speechSynthesisService.synthesizeSSML(
        ssml,
        normalizedOptions
      );

      // Convert format if requested
      const targetFormat = req.query.format as AudioFormat;
      if (targetFormat && targetFormat !== AudioFormat.PCM) {
        const convertedBuffer = await this.speechSynthesisService.convertFormat(
          audioBuffer,
          targetFormat
        );
        
        res.set({
          'Content-Type': targetFormat,
          'Content-Length': convertedBuffer.length
        }).send(convertedBuffer);
        return;
      }

      // Send PCM audio
      res.set({
        'Content-Type': AudioFormat.PCM,
        'Content-Length': audioBuffer.length
      }).send(audioBuffer);

    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'SSML_SYNTHESIS_ERROR',
          message: 'SSML synthesis failed',
          details: error.message
        }
      });
    }
  }
}