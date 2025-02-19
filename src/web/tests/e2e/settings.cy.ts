import { STORAGE_KEYS } from '../../src/utils/storage.utils';
import type { AppSettings } from '../../src/types/settings.types';

// Test data constants
const DEFAULT_SETTINGS: AppSettings = {
  theme: {
    mode: 'light',
    useSystemPreference: false
  },
  audio: {
    inputVolume: 100,
    outputVolume: 100,
    noiseReduction: true,
    config: {
      sampleRate: 16000,
      frameSize: 20,
      bitDepth: 16,
      channels: 1
    },
    latencyBudget: 500
  },
  voice: {
    config: {
      audioConfig: {
        sampleRate: 16000,
        frameSize: 20,
        bitDepth: 16,
        channels: 1
      },
      preferredFormat: 'audio/opus',
      vadEnabled: true,
      vadThreshold: -26,
      noiseFloor: -45
    },
    autoMuteAfterResponse: true,
    wakeWordDetection: false,
    wakeWordSensitivity: 75
  },
  language: {
    primaryLanguage: 'en-US',
    secondaryLanguage: '',
    useSystemLanguage: true,
    rtlSupport: false
  }
};

describe('Settings Panel E2E Tests', () => {
  beforeEach(() => {
    // Clear storage and set default settings
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Visit settings page with custom viewport
    cy.viewport(1280, 720);
    cy.visit('/settings');
    
    // Wait for settings panel to load
    cy.get('[data-cy=settings-panel]').should('be.visible');
  });

  describe('Settings Panel Navigation and Accessibility', () => {
    it('should navigate through settings tabs using keyboard', () => {
      cy.get('[role=tablist]').should('be.visible');
      cy.get('[role=tab]').first().focus().type('{rightarrow}');
      cy.get('[role=tab]').eq(1).should('have.focus');
    });

    it('should meet WCAG 2.1 AA accessibility standards', () => {
      cy.injectAxe();
      cy.checkA11y('[data-cy=settings-panel]', {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa']
        }
      });
    });

    it('should maintain focus management during panel interactions', () => {
      cy.get('[data-cy=settings-heading]').should('have.attr', 'tabindex', '0');
      cy.get('[data-cy=close-settings]').should('have.attr', 'aria-label');
    });
  });

  describe('Theme Settings', () => {
    it('should toggle between light and dark themes', () => {
      cy.get('[data-cy=theme-toggle]').click();
      cy.get('html').should('have.attr', 'data-theme', 'dark');
      
      cy.get('[data-cy=theme-toggle]').click();
      cy.get('html').should('have.attr', 'data-theme', 'light');
    });

    it('should detect and apply system theme preference', () => {
      cy.get('[data-cy=theme-system-preference]').click();
      cy.window().then((win) => {
        const isDark = win.matchMedia('(prefers-color-scheme: dark)').matches;
        cy.get('html').should('have.attr', 'data-theme', isDark ? 'dark' : 'light');
      });
    });

    it('should persist theme preference across page reloads', () => {
      cy.get('[data-cy=theme-toggle]').click();
      cy.reload();
      cy.get('html').should('have.attr', 'data-theme', 'dark');
    });
  });

  describe('Audio Settings', () => {
    it('should adjust input and output volume levels', () => {
      cy.get('[data-cy=volume-slider-input]').as('inputSlider')
        .invoke('val', 75)
        .trigger('change');
      
      cy.get('[data-cy=volume-slider-output]').as('outputSlider')
        .invoke('val', 50)
        .trigger('change');

      cy.get('@inputSlider').should('have.value', '75');
      cy.get('@outputSlider').should('have.value', '50');
    });

    it('should toggle noise reduction setting', () => {
      cy.get('[data-cy=noise-reduction-toggle]').click();
      cy.get('[data-cy=noise-reduction-toggle]').should('be.checked');
    });

    it('should save audio settings to storage', () => {
      cy.get('[data-cy=save-settings]').click();
      cy.window().then((win) => {
        const stored = JSON.parse(win.localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
        expect(stored.audio).to.exist;
      });
    });
  });

  describe('Voice Settings', () => {
    it('should select different voice options', () => {
      cy.get('[data-cy=voice-select]').click();
      cy.get('[data-cy=voice-option-female-1]').click();
      cy.get('[data-cy=voice-select]').should('contain.text', 'Female 1');
    });

    it('should configure wake word detection', () => {
      cy.get('[data-cy=wake-word-toggle]').click();
      cy.get('[data-cy=wake-word-sensitivity]').as('sensitivity')
        .invoke('val', 85)
        .trigger('change');
      
      cy.get('@sensitivity').should('have.value', '85');
    });

    it('should toggle auto-mute after response', () => {
      cy.get('[data-cy=auto-mute-toggle]').click();
      cy.get('[data-cy=auto-mute-toggle]').should('not.be.checked');
    });
  });

  describe('Language Settings', () => {
    it('should change primary language', () => {
      cy.get('[data-cy=language-select-primary]').click();
      cy.get('[data-cy=language-option-es]').click();
      cy.get('[data-cy=settings-heading]').should('contain.text', 'Configuración');
    });

    it('should handle RTL layout switching', () => {
      cy.get('[data-cy=language-select-primary]').click();
      cy.get('[data-cy=language-option-ar]').click();
      cy.get('html').should('have.attr', 'dir', 'rtl');
    });

    it('should test language fallback behavior', () => {
      cy.intercept('GET', '/api/locales/*', { statusCode: 404 });
      cy.get('[data-cy=language-select-primary]').click();
      cy.get('[data-cy=language-option-fr]').click();
      cy.get('[data-cy=settings-heading]').should('contain.text', 'Settings');
    });
  });

  describe('Cross-Browser Compatibility', () => {
    const viewports = [
      { width: 1920, height: 1080, device: 'desktop' },
      { width: 768, height: 1024, device: 'tablet' },
      { width: 375, height: 812, device: 'mobile' }
    ];

    viewports.forEach(({ width, height, device }) => {
      it(`should render correctly on ${device}`, () => {
        cy.viewport(width, height);
        cy.get('[data-cy=settings-panel]').should('be.visible');
        cy.get('[data-cy=settings-panel]').matchImageSnapshot(`settings-${device}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for failed settings save', () => {
      cy.intercept('POST', '/api/settings', { statusCode: 500 });
      cy.get('[data-cy=save-settings]').click();
      cy.get('[data-cy=error-message]').should('be.visible');
    });

    it('should handle network disconnection gracefully', () => {
      cy.intercept('POST', '/api/settings', { forceNetworkError: true });
      cy.get('[data-cy=save-settings]').click();
      cy.get('[data-cy=connection-error]').should('be.visible');
    });

    it('should validate settings before saving', () => {
      cy.get('[data-cy=volume-slider-input]').invoke('val', 150).trigger('change');
      cy.get('[data-cy=validation-error]').should('be.visible');
    });
  });
});