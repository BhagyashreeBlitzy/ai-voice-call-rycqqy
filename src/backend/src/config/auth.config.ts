/**
 * Authentication Configuration Module
 * Defines JWT token settings, expiration times, and security parameters
 * for the voice agent backend authentication system.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.0
import { AuthConfig } from '../types/config.types';

// Initialize environment variables
config();

/**
 * Validates the presence and format of required environment variables
 * for authentication configuration.
 * @throws {Error} If required variables are missing or invalid
 */
function validateEnvironmentVariables(): void {
  // Validate JWT secret
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate token issuer format if provided
  if (process.env.TOKEN_ISSUER && !/^[\w.-]+$/.test(process.env.TOKEN_ISSUER)) {
    throw new Error('TOKEN_ISSUER must contain only alphanumeric characters, dots, and hyphens');
  }

  // Validate token audience format if provided
  if (process.env.TOKEN_AUDIENCE && !/^[\w.-]+$/.test(process.env.TOKEN_AUDIENCE)) {
    throw new Error('TOKEN_AUDIENCE must contain only alphanumeric characters, dots, and hyphens');
  }
}

// Validate environment variables before creating config
validateEnvironmentVariables();

/**
 * Authentication configuration object with comprehensive JWT settings
 * Includes token lifetimes, issuer validation, and audience restrictions
 */
export const authConfig: AuthConfig = {
  // Required JWT secret from environment variables
  jwtSecret: process.env.JWT_SECRET,

  // JWT token expires in 15 minutes for security
  // Aligns with security requirements for short-lived tokens
  jwtExpiresIn: '15m',

  // Refresh token valid for 7 days
  // Allows for extended sessions while maintaining security
  refreshTokenExpiresIn: '7d',

  // Token issuer identifier with fallback
  // Used for token validation and tracking
  tokenIssuer: process.env.TOKEN_ISSUER || 'voice-agent-api',

  // Token audience identifier with fallback
  // Ensures tokens are used by intended clients only
  tokenAudience: process.env.TOKEN_AUDIENCE || 'voice-agent-client'
};

// Default export for the authentication configuration
export default authConfig;