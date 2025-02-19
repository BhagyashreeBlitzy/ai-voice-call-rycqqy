/**
 * AI Voice Agent Backend Server Entry Point
 * Initializes and manages the application server with comprehensive error handling,
 * graceful shutdown, and health monitoring.
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.3.1
import pino from 'pino'; // ^8.0.0
import App from './app';
import { config as appConfig } from './config';
import { logger } from './utils/logger.utils';

// Initialize environment variables
config();

// Validate required environment variables
if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV environment variable is required');
}

// Initialize logger for server-level logging
const serverLogger = pino({
  name: 'server',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime
});

let app: App;

/**
 * Starts the application server with monitoring and health checks
 */
async function startServer(): Promise<void> {
  try {
    // Validate configuration settings
    await appConfig.validateConfigurations();

    // Create new application instance
    app = new App();

    // Get port from environment or default
    const port = parseInt(process.env.PORT || '3000', 10);

    // Start server
    await app.listen(port);

    serverLogger.info('Server started successfully', {
      port,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    serverLogger.error('Server startup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

/**
 * Handles graceful server shutdown with resource cleanup
 * @param signal Process signal triggering shutdown
 */
async function handleShutdown(signal: string): Promise<void> {
  serverLogger.info(`Received ${signal} signal, starting graceful shutdown`);

  try {
    // Stop accepting new connections
    if (app) {
      await app.shutdown();
    }

    // Wait for existing requests to complete (max 30 seconds)
    const shutdownTimeout = appConfig.shutdownTimeout || 30000;
    await new Promise(resolve => setTimeout(resolve, shutdownTimeout));

    // Flush logs
    await logger.flush();

    serverLogger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    serverLogger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
      signal
    });
    process.exit(1);
  }
}

/**
 * Handles uncaught exceptions with error reporting and recovery
 * @param error Uncaught error
 */
function handleUncaughtException(error: Error): void {
  serverLogger.fatal('Uncaught exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Attempt graceful shutdown
  handleShutdown('UNCAUGHT_EXCEPTION').catch(() => {
    process.exit(1);
  });
}

/**
 * Handles unhandled promise rejections
 * @param reason Rejection reason
 * @param promise Rejected promise
 */
function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  serverLogger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString()
  });

  // Attempt graceful shutdown
  handleShutdown('UNHANDLED_REJECTION').catch(() => {
    process.exit(1);
  });
}

// Register process handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

// Start server
startServer().catch(error => {
  serverLogger.fatal('Fatal error during server startup', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});