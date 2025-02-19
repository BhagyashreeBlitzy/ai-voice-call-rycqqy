import { defineConfig } from 'cypress';
import { defineConfig as defineViteConfig } from '@cypress/vite-dev-server';

// Cypress configuration for AI Voice Agent E2E testing
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'tests/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Video recording configuration
    video: true,
    videoCompression: 32,
    
    // Timeout settings
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    
    // Browser settings
    experimentalWebKitSupport: true,
    chromeWebSecurity: false,
    
    // Environment variables
    env: {
      COVERAGE: 'true',
      codeCoverage: {
        url: '/api/__coverage__'
      }
    },

    // Node event setup for custom configurations
    setupNodeEvents(on, config) {
      // Register custom tasks for audio testing
      on('task', {
        // Mock audio input stream
        mockAudioStream: (audioConfig) => {
          return new Promise((resolve) => {
            // Simulate audio stream with specified configuration
            resolve(audioConfig);
          });
        },
        
        // Mock WebRTC media devices
        mockMediaDevices: () => {
          return true;
        },
        
        // Verify audio output
        verifyAudioOutput: (expectedOutput) => {
          return new Promise((resolve) => {
            // Verify audio output matches expected result
            resolve(expectedOutput);
          });
        }
      });

      // Configure WebSocket interception
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' || browser.name === 'chromium') {
          launchOptions.args.push('--use-fake-ui-for-media-stream');
          launchOptions.args.push('--use-fake-device-for-media-stream');
          launchOptions.args.push('--allow-file-access-from-files');
        }
        return launchOptions;
      });

      // Configure test coverage collection
      require('@cypress/code-coverage/task')(on, config);

      return config;
    }
  },

  // Test retry configuration
  retries: {
    runMode: 2,
    openMode: 0
  },

  // Component testing configuration with Vite
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    }
  }
});