import { Conversation } from '../../src/types/conversation.types';

// Cypress v12.0.0
describe('Voice AI Conversation Tests', () => {
  beforeEach(() => {
    // Mock WebSocket connection
    cy.intercept('wss://*/stream', {
      body: { type: 'connection_established' }
    }).as('wsConnection');

    // Mock conversation API endpoints
    cy.intercept('POST', '/api/v1/conversations', {
      statusCode: 200,
      body: {
        id: 'test-conversation-id',
        sessionId: 'test-session-id',
        status: 'active',
        messages: []
      }
    }).as('createConversation');

    // Mock browser audio APIs
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves(
        new MediaStream()
      );
      
      // Mock AudioContext and AnalyserNode
      const audioContextMock = {
        createAnalyser: () => ({
          connect: cy.stub(),
          disconnect: cy.stub(),
          getByteTimeDomainData: cy.stub()
        }),
        createMediaStreamSource: cy.stub()
      };
      cy.stub(win, 'AudioContext').returns(audioContextMock);
    });

    // Visit the main conversation page
    cy.visit('/');
    cy.wait('@wsConnection');
  });

  describe('Conversation Interface', () => {
    it('should render initial conversation interface correctly', () => {
      cy.get('[data-testid="conversation-container"]').should('be.visible');
      cy.get('[data-testid="microphone-button"]').should('be.visible');
      cy.get('[data-testid="voice-activity-display"]').should('exist');
      cy.get('[data-testid="message-list"]').should('be.visible');
    });

    it('should show loading states during initialization', () => {
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
      cy.wait('@createConversation');
      cy.get('[data-testid="loading-indicator"]').should('not.exist');
    });

    it('should display conversation history correctly', () => {
      const mockMessages = [
        { id: '1', content: 'Hello', role: 'user', timestamp: Date.now() },
        { id: '2', content: 'Hi there!', role: 'ai', timestamp: Date.now() }
      ];

      cy.intercept('GET', '/api/v1/conversations/*/messages', {
        statusCode: 200,
        body: { messages: mockMessages }
      }).as('getMessages');

      cy.get('[data-testid="message-list"]').within(() => {
        cy.get('[data-testid="message-item"]').should('have.length', 2);
        cy.get('[data-testid="user-message"]').should('contain', 'Hello');
        cy.get('[data-testid="ai-message"]').should('contain', 'Hi there!');
      });
    });
  });

  describe('Voice Interactions', () => {
    it('should activate microphone on button click', () => {
      cy.get('[data-testid="microphone-button"]').click();
      cy.get('[data-testid="microphone-button"]').should('have.class', 'active');
      cy.get('[data-testid="voice-activity-display"]').should('have.class', 'recording');
    });

    it('should show voice activity visualization', () => {
      cy.get('[data-testid="microphone-button"]').click();
      cy.get('[data-testid="voice-activity-display"]').should('have.class', 'active');
      
      // Simulate audio data
      cy.window().then((win) => {
        const analyser = win.AudioContext().createAnalyser();
        analyser.getByteTimeDomainData.yields(new Uint8Array([128, 150, 170, 150, 128]));
      });

      cy.get('[data-testid="voice-activity-display"]').should('have.attr', 'data-level');
    });

    it('should process voice input and display response', () => {
      // Mock voice processing response
      cy.intercept('POST', '/api/v1/messages', {
        statusCode: 200,
        body: {
          id: 'test-message-id',
          content: 'I understood your message',
          role: 'ai',
          timestamp: Date.now()
        }
      }).as('processVoice');

      cy.get('[data-testid="microphone-button"]').click();
      cy.wait(2000); // Simulate voice input duration
      cy.get('[data-testid="microphone-button"]').click();
      
      cy.wait('@processVoice');
      cy.get('[data-testid="ai-message"]').should('contain', 'I understood your message');
    });
  });

  describe('Error Handling', () => {
    it('should handle microphone permission denial', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator.mediaDevices, 'getUserMedia').rejects(
          new Error('Permission denied')
        );
      });

      cy.get('[data-testid="microphone-button"]').click();
      cy.get('[data-testid="error-display"]').should('contain', 'Microphone access denied');
    });

    it('should handle WebSocket disconnection', () => {
      // Simulate WebSocket disconnection
      cy.window().then((win) => {
        win.dispatchEvent(new Event('offline'));
      });

      cy.get('[data-testid="error-display"]').should('contain', 'Connection lost');
      cy.get('[data-testid="microphone-button"]').should('be.disabled');

      // Simulate reconnection
      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });

      cy.get('[data-testid="error-display"]').should('not.exist');
      cy.get('[data-testid="microphone-button"]').should('not.be.disabled');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('POST', '/api/v1/messages', {
        statusCode: 500,
        body: {
          error: 'Internal server error'
        }
      }).as('apiError');

      cy.get('[data-testid="microphone-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="microphone-button"]').click();
      
      cy.wait('@apiError');
      cy.get('[data-testid="error-display"]').should('contain', 'Unable to process voice input');
    });
  });

  describe('Performance Metrics', () => {
    it('should complete voice processing within latency budget', () => {
      const startTime = Date.now();
      
      cy.get('[data-testid="microphone-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="microphone-button"]').click();
      
      cy.wait('@processVoice').then(() => {
        const processingTime = Date.now() - startTime;
        expect(processingTime).to.be.lessThan(2000); // 2 second latency budget
      });
    });

    it('should maintain responsive UI during processing', () => {
      cy.get('[data-testid="microphone-button"]').click();
      
      // Verify UI remains responsive
      cy.get('[data-testid="message-list"]').should('be.visible');
      cy.get('[data-testid="voice-activity-display"]').should('be.visible');
      cy.get('[data-testid="loading-indicator"]').should('not.exist');
    });
  });
});