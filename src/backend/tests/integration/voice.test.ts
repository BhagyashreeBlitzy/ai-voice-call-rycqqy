/**
 * Integration tests for voice-related functionality
 * Tests voice configuration, synthesis, and API endpoints
 * @version 1.0.0
 */

import supertest from 'supertest'; // ^6.3.3
import { VoiceController } from '../../src/api/controllers/voice.controller';
import { SpeechSynthesisService } from '../../src/services/audio/speechSynthesis.service';
import { VoiceConfig, VoiceSynthesisOptions } from '../../src/interfaces/voice.interface';
import { AudioFormat } from '../../types/audio.types';
import { HttpStatusCode } from '../../types/common.types';
import { VOICE_IDS, VOICE_LANGUAGES, SYNTHESIS_FORMATS } from '../../constants/voice.constants';

// Test server setup
const app = require('../../src/app'); // Assuming Express app is exported
const request = supertest(app);

// Test timeout configuration
jest.setTimeout(30000); // 30 seconds for synthesis operations

describe('Voice API Integration Tests', () => {
  let voiceController: VoiceController;
  let speechService: SpeechSynthesisService;

  beforeAll(async () => {
    // Initialize services
    speechService = new SpeechSynthesisService();
    voiceController = new VoiceController(speechService);

    // Set up test environment
    process.env.AWS_POLLY_ACCESS_KEY = 'test-access-key';
    process.env.AWS_POLLY_SECRET_KEY = 'test-secret-key';
  });

  afterAll(async () => {
    // Cleanup
    delete process.env.AWS_POLLY_ACCESS_KEY;
    delete process.env.AWS_POLLY_SECRET_KEY;
  });

  describe('GET /api/v1/voices', () => {
    it('should return available voices with correct metadata', async () => {
      const response = await request
        .get('/api/v1/voices')
        .expect(HttpStatusCode.OK);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verify voice metadata structure
      const voice = response.body.data[0];
      expect(voice).toHaveProperty('voiceId');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('language');
      expect(voice).toHaveProperty('gender');
      expect(voice).toHaveProperty('supportedEffects');
      expect(voice).toHaveProperty('sampleRate');
      expect(voice).toHaveProperty('codecSupport');
    });

    it('should include all configured voice options', async () => {
      const response = await request
        .get('/api/v1/voices')
        .expect(HttpStatusCode.OK);

      const voiceIds = response.body.data.map(v => v.voiceId);
      Object.values(VOICE_IDS).forEach(id => {
        expect(voiceIds).toContain(id);
      });
    });

    it('should return voices with correct language support', async () => {
      const response = await request
        .get('/api/v1/voices')
        .expect(HttpStatusCode.OK);

      response.body.data.forEach(voice => {
        expect(Object.values(VOICE_LANGUAGES).map(l => l.code))
          .toContain(voice.language);
      });
    });
  });

  describe('POST /api/v1/voices/config', () => {
    const testConfig: VoiceConfig = {
      audioConfig: {
        sampleRate: 16000,
        frameSize: 20,
        bitDepth: 16,
        channels: 1,
        latencyBudget: 500
      },
      preferredFormat: AudioFormat.OPUS,
      vadEnabled: true,
      vadThreshold: -26,
      noiseFloor: -45,
      latencyBudget: 500,
      noiseCancellation: true
    };

    it('should update voice configuration successfully', async () => {
      const response = await request
        .post('/api/v1/voices/config')
        .send(testConfig)
        .expect(HttpStatusCode.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(testConfig);
    });

    it('should validate audio configuration parameters', async () => {
      const invalidConfig = {
        ...testConfig,
        audioConfig: {
          ...testConfig.audioConfig,
          sampleRate: 8000 // Invalid sample rate
        }
      };

      await request
        .post('/api/v1/voices/config')
        .send(invalidConfig)
        .expect(HttpStatusCode.BAD_REQUEST);
    });

    it('should enforce VAD threshold limits', async () => {
      const invalidConfig = {
        ...testConfig,
        vadThreshold: -10 // Invalid threshold
      };

      await request
        .post('/api/v1/voices/config')
        .send(invalidConfig)
        .expect(HttpStatusCode.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/voices/synthesize', () => {
    const testOptions: VoiceSynthesisOptions = {
      voiceId: VOICE_IDS.MALE_1,
      rate: 1.0,
      pitch: 0,
      volume: 100,
      languageCode: VOICE_LANGUAGES.EN_US.code,
      ssmlEnabled: false,
      effectsProfile: []
    };

    it('should synthesize text successfully', async () => {
      const response = await request
        .post('/api/v1/voices/synthesize')
        .send({
          text: 'Hello, this is a test.',
          options: testOptions
        })
        .expect(HttpStatusCode.OK);

      expect(response.headers['content-type']).toBe(AudioFormat.PCM);
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should handle different audio formats', async () => {
      const formats = [AudioFormat.OPUS, AudioFormat.PCM, AudioFormat.AAC];

      for (const format of formats) {
        const response = await request
          .post('/api/v1/voices/synthesize')
          .query({ format })
          .send({
            text: 'Format test.',
            options: testOptions
          })
          .expect(HttpStatusCode.OK);

        expect(response.headers['content-type']).toBe(format);
      }
    });

    it('should enforce text length limits', async () => {
      const longText = 'a'.repeat(5000); // Exceeds limit

      await request
        .post('/api/v1/voices/synthesize')
        .send({
          text: longText,
          options: testOptions
        })
        .expect(HttpStatusCode.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/voices/synthesize/ssml', () => {
    const testOptions: VoiceSynthesisOptions = {
      voiceId: VOICE_IDS.FEMALE_1,
      rate: 1.0,
      pitch: 0,
      volume: 100,
      languageCode: VOICE_LANGUAGES.EN_US.code,
      ssmlEnabled: true,
      effectsProfile: []
    };

    it('should synthesize valid SSML successfully', async () => {
      const ssml = `
        <speak>
          <prosody rate="slow" pitch="+2st">
            This is a test of SSML synthesis.
          </prosody>
        </speak>
      `;

      const response = await request
        .post('/api/v1/voices/synthesize/ssml')
        .send({
          ssml,
          options: testOptions
        })
        .expect(HttpStatusCode.OK);

      expect(response.headers['content-type']).toBe(AudioFormat.PCM);
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should validate SSML structure', async () => {
      const invalidSsml = `
        <speak>
          <invalid>This is invalid SSML.</invalid>
        </speak>
      `;

      await request
        .post('/api/v1/voices/synthesize/ssml')
        .send({
          ssml: invalidSsml,
          options: testOptions
        })
        .expect(HttpStatusCode.BAD_REQUEST);
    });

    it('should handle complex SSML with multiple effects', async () => {
      const complexSsml = `
        <speak>
          <prosody rate="slow">
            <emphasis level="strong">
              Important announcement:
            </emphasis>
            <break time="500ms"/>
            <prosody pitch="+2st">
              This is a test of multiple SSML effects.
            </prosody>
          </prosody>
        </speak>
      `;

      const response = await request
        .post('/api/v1/voices/synthesize/ssml')
        .send({
          ssml: complexSsml,
          options: testOptions
        })
        .expect(HttpStatusCode.OK);

      expect(response.headers['content-type']).toBe(AudioFormat.PCM);
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle concurrent synthesis requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request
          .post('/api/v1/voices/synthesize')
          .send({
            text: 'Concurrent test.',
            options: {
              voiceId: VOICE_IDS.MALE_1,
              rate: 1.0,
              languageCode: VOICE_LANGUAGES.EN_US.code,
              ssmlEnabled: false
            }
          })
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(HttpStatusCode.OK);
      });
    });

    it('should maintain response times within latency budget', async () => {
      const startTime = Date.now();
      
      await request
        .post('/api/v1/voices/synthesize')
        .send({
          text: 'Latency test.',
          options: {
            voiceId: VOICE_IDS.MALE_1,
            rate: 1.0,
            languageCode: VOICE_LANGUAGES.EN_US.code
          }
        })
        .expect(HttpStatusCode.OK);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2 second latency budget
    });

    it('should handle service unavailability gracefully', async () => {
      // Simulate service failure by using invalid credentials
      process.env.AWS_POLLY_ACCESS_KEY = 'invalid-key';

      await request
        .post('/api/v1/voices/synthesize')
        .send({
          text: 'Error test.',
          options: {
            voiceId: VOICE_IDS.MALE_1,
            rate: 1.0,
            languageCode: VOICE_LANGUAGES.EN_US.code
          }
        })
        .expect(HttpStatusCode.SERVICE_UNAVAILABLE);

      // Restore valid credentials
      process.env.AWS_POLLY_ACCESS_KEY = 'test-access-key';
    });
  });
});