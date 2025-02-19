import type { AudioLevel } from '../../types/audio.types';

// Constants for test configuration
const TEST_TIMEOUT = 10000;
const VOICE_DETECTION_TIMEOUT = 2000;
const AUDIO_PROCESSING_TIMEOUT = 500;

// Mock audio data for testing
const mockAudioData = {
  rms: -26,
  peak: -20,
  clipping: false
};

describe('Voice Interaction Tests', () => {
  beforeEach(() => {
    // Visit the main conversation page
    cy.visit('/conversation');

    // Stub browser permissions to auto-grant microphone access
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia')
        .resolves(new MediaStream());
    });

    // Mock WebRTC audio stream
    cy.window().then((win) => {
      const mockStream = new MediaStream();
      const mockTrack = new MediaStreamTrack();
      mockStream.addTrack(mockTrack);
      win.MediaStream = () => mockStream;
    });

    // Wait for page load and component initialization
    cy.get('[data-testid="microphone-button"]').should('exist');
  });

  describe('Microphone Controls', () => {
    it('should request microphone permissions on button click', () => {
      cy.get('[data-testid="microphone-button"]').click();
      
      // Verify permission request
      cy.window().its('navigator.mediaDevices.getUserMedia')
        .should('have.been.calledWith', {
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
    });

    it('should start recording when microphone button is clicked', () => {
      cy.get('[data-testid="microphone-button"]')
        .as('micButton')
        .click();

      // Verify recording state
      cy.get('@micButton')
        .should('have.attr', 'aria-pressed', 'true')
        .and('have.class', 'recording');

      // Verify visual feedback
      cy.get('[data-testid="voice-activity-display"]')
        .should('be.visible');

      // Verify audio stream initialization
      cy.window().then((win) => {
        expect(win.AudioContext).to.have.been.called;
      });
    });

    it('should stop recording when button is clicked again', () => {
      const micButton = cy.get('[data-testid="microphone-button"]');
      
      // Start recording
      micButton.click();
      
      // Stop recording
      micButton.click();

      // Verify stopped state
      micButton
        .should('have.attr', 'aria-pressed', 'false')
        .and('not.have.class', 'recording');

      // Verify cleanup
      cy.window().then((win) => {
        expect(win.AudioContext.prototype.close).to.have.been.called;
      });
    });
  });

  describe('Voice Activity Detection', () => {
    it('should detect voice activity correctly', () => {
      // Start recording
      cy.get('[data-testid="microphone-button"]').click();

      // Mock voice input above threshold
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('voiceactivity', {
          detail: { audioLevel: { ...mockAudioData, rms: -20 } }
        }));
      });

      // Verify voice detection indicators
      cy.get('[data-testid="voice-activity-display"]')
        .should('have.attr', 'data-voice-detected', 'true')
        .and('have.class', 'active');

      // Verify waveform visualization
      cy.get('canvas.waveform-visualizer')
        .should('be.visible')
        .and('have.css', 'stroke-style', 'rgb(26, 144, 255)');
    });

    it('should handle background noise filtering', () => {
      cy.get('[data-testid="microphone-button"]').click();

      // Mock background noise below threshold
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('voiceactivity', {
          detail: { audioLevel: { ...mockAudioData, rms: -40 } }
        }));
      });

      // Verify noise suppression
      cy.get('[data-testid="voice-activity-display"]')
        .should('have.attr', 'data-voice-detected', 'false');
    });

    it('should indicate audio clipping', () => {
      cy.get('[data-testid="microphone-button"]').click();

      // Mock clipping audio levels
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('voiceactivity', {
          detail: { audioLevel: { ...mockAudioData, clipping: true, peak: -1 } }
        }));
      });

      // Verify clipping indicators
      cy.get('[data-testid="voice-activity-display"]')
        .should('have.class', 'clipping')
        .and('have.css', 'color', 'rgb(220, 53, 69)');
    });
  });

  describe('Error Handling', () => {
    it('should handle microphone permission denial', () => {
      // Mock permission denial
      cy.window().then((win) => {
        cy.stub(win.navigator.mediaDevices, 'getUserMedia')
          .rejects(new Error('Permission denied'));
      });

      cy.get('[data-testid="microphone-button"]').click();

      // Verify error state
      cy.get('[role="alert"]')
        .should('be.visible')
        .and('contain.text', 'Permission denied');

      // Verify button state
      cy.get('[data-testid="microphone-button"]')
        .should('have.class', 'error')
        .and('have.attr', 'aria-disabled', 'true');
    });

    it('should handle device initialization errors', () => {
      // Mock device error
      cy.window().then((win) => {
        cy.stub(win.AudioContext.prototype, 'createMediaStreamSource')
          .throws(new Error('Audio device error'));
      });

      cy.get('[data-testid="microphone-button"]').click();

      // Verify error handling
      cy.get('[role="alert"]')
        .should('contain.text', 'Audio device error');
    });

    it('should recover from temporary audio glitches', () => {
      cy.get('[data-testid="microphone-button"]').click();

      // Simulate audio glitch
      cy.window().then((win) => {
        win.dispatchEvent(new Event('audioprocessingerror'));
      });

      // Verify recovery
      cy.get('[data-testid="voice-activity-display"]', { timeout: 5000 })
        .should('not.have.class', 'error');
    });
  });

  describe('Performance Requirements', () => {
    it('should maintain low latency for audio processing', () => {
      cy.get('[data-testid="microphone-button"]').click();

      // Monitor processing time
      cy.window().then((win) => {
        const start = performance.now();
        win.dispatchEvent(new CustomEvent('voiceactivity', {
          detail: { audioLevel: mockAudioData }
        }));
        const end = performance.now();
        expect(end - start).to.be.lessThan(AUDIO_PROCESSING_TIMEOUT);
      });
    });

    it('should handle continuous audio streaming', () => {
      cy.get('[data-testid="microphone-button"]').click();

      // Simulate 10 seconds of audio
      for (let i = 0; i < 10; i++) {
        cy.window().then((win) => {
          win.dispatchEvent(new CustomEvent('voiceactivity', {
            detail: { audioLevel: mockAudioData }
          }));
        });
        cy.wait(1000);
      }

      // Verify stable performance
      cy.window().then((win) => {
        expect(win.performance.memory.usedJSHeapSize).to.be.lessThan(50 * 1024 * 1024); // 50MB limit
      });
    });
  });
});