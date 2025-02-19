import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { API_ENDPOINTS, CONTENT_TYPES } from '../../constants/api.constants';
import { VoiceId } from '../../types/voice.types';
import { VOICE_ACTIVITY_THRESHOLDS } from '../../constants/voice.constants';
import MicrophoneButton from '../../components/audio/MicrophoneButton';
import { VoiceService } from '../../services/voice.service';
import { useVoiceActivity } from '../../hooks/useVoiceActivity';

// Mock WebRTC and Audio APIs
const mockMediaStream = {
  getTracks: () => [{
    stop: jest.fn(),
    getSettings: () => ({
      sampleRate: 16000,
      channelCount: 1
    })
  }]
};

const mockAudioContext = {
  createMediaStreamSource: jest.fn(),
  createAnalyser: jest.fn(),
  createGain: jest.fn(),
  suspend: jest.fn(),
  resume: jest.fn(),
  close: jest.fn()
};

// MSW Server Setup
const server = setupServer(
  rest.get(`${API_ENDPOINTS.VOICES.LIST}`, (req, res, ctx) => {
    return res(ctx.json([
      {
        voiceId: VoiceId.FEMALE_1,
        name: 'Female Voice 1',
        language: 'en-US',
        gender: 'female',
        supportedFeatures: ['ssml', 'prosody']
      }
    ]));
  }),
  
  rest.post(`${API_ENDPOINTS.VOICES.GET}`, (req, res, ctx) => {
    return res(
      ctx.set('Content-Type', CONTENT_TYPES.AUDIO_OPUS),
      ctx.body(new ArrayBuffer(1024))
    );
  })
);

describe('Voice Integration Tests', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    // Setup mocks
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockMediaStream)
    } as any;
    
    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext) as any;
    
    voiceService = new VoiceService();
    
    // Start MSW server
    server.listen();
  });

  afterEach(() => {
    jest.clearAllMocks();
    server.resetHandlers();
    server.close();
  });

  describe('MicrophoneButton Integration', () => {
    it('should handle microphone activation with proper accessibility', async () => {
      const { getByRole } = render(
        <MicrophoneButton 
          size="medium"
          ariaLabel="Toggle microphone"
        />
      );

      const button = getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Start recording');
      expect(button).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(button).toHaveAttribute('aria-label', 'Stop recording');
      });
    });

    it('should handle microphone errors gracefully', async () => {
      const errorMessage = 'Permission denied';
      global.navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(
        new Error(errorMessage)
      );

      const { getByRole } = render(
        <MicrophoneButton 
          size="medium"
          onError={jest.fn()}
        />
      );

      fireEvent.click(getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Voice Activity Detection Integration', () => {
    it('should detect voice activity and update visual feedback', async () => {
      const mockAudioLevel = {
        rms: -20,
        peak: -15,
        clipping: false
      };

      const { getByRole } = render(
        <MicrophoneButton 
          size="medium"
        />
      );

      // Start recording
      fireEvent.click(getByRole('button'));

      // Simulate voice activity
      await waitFor(() => {
        const visualizer = screen.getByRole('img', { 
          name: /audio waveform visualization/i 
        });
        expect(visualizer).toBeInTheDocument();
      });
    });

    it('should handle voice activity thresholds correctly', async () => {
      const { result } = renderHook(() => useVoiceActivity(voiceService, {
        vadThreshold: VOICE_ACTIVITY_THRESHOLDS.VAD_THRESHOLD_DB,
        noiseFloor: VOICE_ACTIVITY_THRESHOLDS.NOISE_FLOOR_DB,
        silenceTimeout: 1500
      }));

      // Simulate audio levels above threshold
      await act(async () => {
        result.current.audioLevel = {
          rms: -20, // Above VAD threshold
          peak: -15,
          clipping: false
        };
      });

      expect(result.current.isVoiceDetected).toBe(true);

      // Simulate audio levels below threshold
      await act(async () => {
        result.current.audioLevel = {
          rms: -50, // Below VAD threshold
          peak: -45,
          clipping: false
        };
      });

      expect(result.current.isVoiceDetected).toBe(false);
    });
  });

  describe('Voice Synthesis Integration', () => {
    it('should synthesize speech with correct voice settings', async () => {
      const text = 'Hello, world!';
      const synthesisOptions = {
        voiceId: VoiceId.FEMALE_1,
        speakingRate: 1.0,
        pitch: 0,
        volume: 1.0
      };

      const result = await voiceService.synthesizeSpeech(text, synthesisOptions);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle SSML tags correctly', async () => {
      const ssmlText = '<speak>Hello <break time="1s"/> world!</speak>';
      
      const result = await voiceService.synthesizeSpeech(ssmlText, {
        voiceId: VoiceId.FEMALE_1
      });
      
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should cache frequently used phrases', async () => {
      const text = 'Hello';
      
      // First synthesis request
      await voiceService.synthesizeSpeech(text);
      
      // Second synthesis request should use cache
      const spy = jest.spyOn(voiceService as any, 'synthesizeSpeech');
      await voiceService.synthesizeSpeech(text);
      
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors during synthesis', async () => {
      server.use(
        rest.post(`${API_ENDPOINTS.VOICES.GET}`, (req, res, ctx) => {
          return res(ctx.status(503));
        })
      );

      await expect(
        voiceService.synthesizeSpeech('Hello')
      ).rejects.toThrow('Speech synthesis failed');
    });

    it('should handle invalid voice configuration', async () => {
      await expect(
        voiceService.updateVoiceConfig({
          vadThreshold: 10 // Invalid threshold
        })
      ).rejects.toThrow('VAD threshold must be between -60 and 0 dB');
    });
  });
});