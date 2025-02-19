// jest.config.ts
// Jest configuration for web frontend testing
// Using jest ^29.0.0

import type { Config } from 'jest';

const config: Config = {
  // Use jsdom environment for DOM manipulation in tests
  testEnvironment: 'jsdom',

  // Define root directory for test discovery
  roots: ['<rootDir>/src'],

  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Transform files with appropriate preprocessors
  transform: {
    // TypeScript files
    '^.+\\.(ts|tsx)$': 'ts-jest',
    // CSS/SCSS files
    '^.+\\.(css|scss)$': 'jest-transform-stub',
    // Other assets
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': 'jest-transform-stub'
  },

  // Module name mapping for imports
  moduleNameMapper: {
    // Path alias mapping
    '^@/(.*)$': '<rootDir>/src/$1',
    // Style file mocks
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    // Asset file mocks
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.js'
  },

  // Coverage configuration
  coverageDirectory: 'coverage',
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx',
    '!src/**/*.stories.{ts,tsx}'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Additional configuration
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Automatically clear mock calls and instances between tests
  resetModules: true,

  // The maximum number of workers used to run tests
  maxWorkers: '50%',

  // Prevent tests from printing console.log statements
  silent: false,

  // Allow for additional context providers in testing
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};

export default config;