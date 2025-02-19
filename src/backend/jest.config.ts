// jest.config.ts
// ts-jest: ^29.1.1 - TypeScript preprocessor for Jest
// jest: ^29.0.0 - Testing framework configuration types

import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for test discovery
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Test file patterns to match
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Path alias mapping for imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],

  // Code coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'clover'
  ],

  // Paths to exclude from coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/',
    'src/types/',
    'src/interfaces/'
  ],

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup and teardown files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',

  // Test execution configuration
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',

  // TypeScript transformation configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json'
      }
    ]
  }
};

export default config;