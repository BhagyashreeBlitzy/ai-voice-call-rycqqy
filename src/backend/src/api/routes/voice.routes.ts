/**
 * Voice Routes Configuration
 * Implements secure and optimized routes for voice-related functionality
 * including voice selection, configuration, and text-to-speech synthesis
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import compression from 'compression'; // v1.7.4
import rateLimit from 'express-rate-limit'; // v6.7.0
import { VoiceController } from '../controllers/voice.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { validateRequest, sanitizeRequest } from '../middlewares/validation.middleware';
import { VoiceSynthesisOptions } from '../../interfaces/voice.interface';
import { AudioFormat } from '../../types/audio.types';
import { HttpStatusCode } from '../../types/common.types';

// Maximum payload size for synthesis requests (5MB)
const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;

// Rate limiting configuration for voice endpoints
const voiceRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many voice requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Synthesis request validation schema
const synthesisSchema = {
  type: 'object',
  required: ['text', 'options'],
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 5000
    },
    options: {
      type: 'object',
      required: ['voiceId'],
      properties: {
        voiceId: { type: 'string' },
        rate: { type: 'number', minimum: 0.5, maximum: 2.0 },
        pitch: { type: 'number', minimum: -20, maximum: 20 },
        volume: { type: 'number', minimum: 0, maximum: 100 },
        languageCode: { type: 'string' },
        effectsProfile: { 
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
};

// SSML validation schema
const ssmlSchema = {
  type: 'object',
  required: ['ssml', 'options'],
  properties: {
    ssml: {
      type: 'string',
      pattern: '^<speak>.*</speak>$',
      minLength: 14,
      maxLength: 5000
    },
    options: {
      type: 'object',
      required: ['voiceId'],
      properties: {
        voiceId: { type: 'string' },
        languageCode: { type: 'string' }
      }
    }
  }
};

/**
 * Initializes voice routes with security and performance features
 * @param voiceController Voice controller instance
 * @returns Configured Express router
 */
export const initializeVoiceRoutes = (voiceController: VoiceController): Router => {
  const router = Router();

  // Apply global middleware
  router.use(compression());
  router.use(authMiddleware);
  router.use(sanitizeRequest);

  // GET /voices - Retrieve available voices with caching
  router.get('/voices', async (req, res) => {
    try {
      // Set cache headers for performance
      res.set({
        'Cache-Control': 'public, max-age=3600',
        'Vary': 'Accept-Encoding'
      });

      await voiceController.getAvailableVoices(req, res);
    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: 'VOICE_LIST_ERROR',
          message: 'Failed to retrieve voice list',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // POST /synthesize - Text-to-speech synthesis
  router.post('/synthesize',
    voiceRateLimiter,
    validateRequest(synthesisSchema),
    async (req, res) => {
      try {
        if (req.headers['content-length'] && 
            parseInt(req.headers['content-length']) > MAX_PAYLOAD_SIZE) {
          return res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'Request payload too large'
            }
          });
        }

        const format = (req.query.format as AudioFormat) || AudioFormat.PCM;
        req.body.options.format = format;

        await voiceController.synthesizeText(req, res);
      } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: {
            code: 'SYNTHESIS_ERROR',
            message: 'Speech synthesis failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  );

  // POST /synthesize/ssml - SSML-based synthesis
  router.post('/synthesize/ssml',
    voiceRateLimiter,
    validateRequest(ssmlSchema),
    async (req, res) => {
      try {
        if (req.headers['content-length'] && 
            parseInt(req.headers['content-length']) > MAX_PAYLOAD_SIZE) {
          return res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'Request payload too large'
            }
          });
        }

        const format = (req.query.format as AudioFormat) || AudioFormat.PCM;
        req.body.options.format = format;

        await voiceController.synthesizeSSML(req, res);
      } catch (error) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: {
            code: 'SSML_SYNTHESIS_ERROR',
            message: 'SSML synthesis failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  );

  return router;
};

// Export configured router
export default initializeVoiceRoutes;