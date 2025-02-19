import { config } from 'dotenv'; // v16.3.1
import { ClusterOptions } from 'ioredis'; // v5.3.2
import winston from 'winston'; // v3.8.2
import { RedisConfig } from '../types/config.types';

// Load environment variables
config();

// Constants for retry strategy
const MAX_RETRIES = 10;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const JITTER_MAX = 100;

// Fatal errors that should not be retried
const FATAL_ERRORS = new Set([
  'ECONNREFUSED',
  'AUTH_FAILED',
  'ERR invalid password',
  'ECONNRESET'
]);

/**
 * Creates a retry strategy with exponential backoff and jitter
 * @param retries - Number of retry attempts so far
 * @param error - Error that triggered the retry
 * @returns Delay in milliseconds or error if max retries reached
 */
const createRetryStrategy = (retries: number, error: Error): number | Error => {
  // Log retry attempt
  winston.info(`Redis retry attempt ${retries + 1}/${MAX_RETRIES}`, {
    error: error.message,
    code: (error as any).code,
    timestamp: new Date().toISOString()
  });

  // Check for fatal errors
  if (FATAL_ERRORS.has((error as any).code)) {
    winston.error('Fatal Redis connection error', {
      error: error.message,
      code: (error as any).code
    });
    return error;
  }

  // Check max retries
  if (retries >= MAX_RETRIES) {
    winston.error('Maximum Redis retry attempts reached', {
      maxRetries: MAX_RETRIES
    });
    return error;
  }

  // Calculate delay with exponential backoff and jitter
  const delay = Math.min(
    BASE_RETRY_DELAY * Math.pow(2, retries) + Math.random() * JITTER_MAX,
    MAX_RETRY_DELAY
  );

  winston.info(`Redis retry scheduled`, { delay, retryNumber: retries + 1 });
  return delay;
};

/**
 * Creates Redis connection event listeners for monitoring
 * @param client - Redis client instance
 */
const createConnectionListener = (client: any): void => {
  client.on('connect', () => {
    winston.info('Redis client connecting');
  });

  client.on('ready', () => {
    winston.info('Redis client connected and ready');
  });

  client.on('error', (err: Error) => {
    winston.error('Redis client error', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
  });

  client.on('close', () => {
    winston.warn('Redis client connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    winston.info('Redis client reconnecting', { delay });
  });
};

/**
 * Redis configuration object with comprehensive settings
 * for both cache and session store functionality
 */
export const redisConfig: RedisConfig & {
  cluster: ClusterOptions;
  tls: any;
  connectionListener: typeof createConnectionListener;
} = {
  // Basic connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  
  // Retry strategy
  retryStrategy: createRetryStrategy,
  maxRetries: MAX_RETRIES,
  connectTimeout: 10000,
  keyPrefix: 'voice-agent:',

  // Cluster configuration
  cluster: {
    nodes: process.env.REDIS_CLUSTER_NODES ? 
      JSON.parse(process.env.REDIS_CLUSTER_NODES) : 
      [{ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10) }],
    clusterRetryStrategy: createRetryStrategy,
    scaleReads: 'slave',
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    retryDelayOnTryAgain: 100,
    enableOfflineQueue: true,
    enableReadyCheck: true,
    slotsRefreshTimeout: 2000,
    slotsRefreshInterval: 5000
  },

  // TLS/Security settings
  tls: process.env.REDIS_TLS_ENABLED === 'true' ? {
    rejectUnauthorized: true,
    ca: process.env.REDIS_CA_CERT,
    cert: process.env.REDIS_CLIENT_CERT,
    key: process.env.REDIS_CLIENT_KEY
  } : undefined,

  // Connection monitoring
  connectionListener: createConnectionListener
};

export default redisConfig;