import winston from 'winston';  // v3.11.0
import DailyRotateFile from 'winston-daily-rotate-file';  // v4.7.1
import { loggerConfig } from '../config/logger.config';
import { v4 as uuidv4 } from 'uuid';  // For correlation IDs

// Sensitive data patterns for sanitization
const SENSITIVE_PATTERNS = [
  /password[^,}]* [:=] ["'].*["']/gi,
  /token[^,}]* [:=] ["'].*["']/gi,
  /secret[^,}]* [:=] ["'].*["']/gi,
  /key[^,}]* [:=] ["'].*["']/gi,
  /authorization[^,}]* [:=] ["'].*["']/gi
];

// Interface for structured log metadata
interface LogMetadata {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  component?: string;
  [key: string]: any;
}

// Interface for transport health metrics
interface TransportMetrics {
  successful: number;
  failed: number;
  lastError?: Error;
  lastSuccess?: Date;
}

class Logger {
  private static instance: Logger;
  private winstonLogger: winston.Logger;
  private transportMetrics: Map<string, TransportMetrics>;
  private logBuffer: Array<{ level: string; message: string; metadata: LogMetadata }>;
  private readonly bufferSize: number = 1000;
  private readonly flushInterval: number = 5000;

  private constructor() {
    this.initializeLogger();
    this.transportMetrics = new Map();
    this.logBuffer = [];
    this.setupBufferFlushing();
    this.initializeTransportMonitoring();
  }

  private initializeLogger(): void {
    this.winstonLogger = winston.createLogger({
      ...loggerConfig,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
    });
  }

  private initializeTransportMonitoring(): void {
    this.winstonLogger.transports.forEach(transport => {
      this.transportMetrics.set(transport.name, {
        successful: 0,
        failed: 0
      });

      // Wrap transport log method to track metrics
      const originalLog = transport.log.bind(transport);
      transport.log = (info: any, callback: () => void) => {
        originalLog(info, (error?: Error) => {
          const metrics = this.transportMetrics.get(transport.name)!;
          if (error) {
            metrics.failed++;
            metrics.lastError = error;
          } else {
            metrics.successful++;
            metrics.lastSuccess = new Date();
          }
          callback();
        });
      };
    });
  }

  private setupBufferFlushing(): void {
    setInterval(() => this.flushBuffer(), this.flushInterval);
  }

  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    entries.forEach(entry => {
      this.winstonLogger.log({
        level: entry.level,
        message: entry.message,
        ...entry.metadata
      });
    });
  }

  private sanitizeMessage(message: string): string {
    SENSITIVE_PATTERNS.forEach(pattern => {
      message = message.replace(pattern, (match) => {
        const prefix = match.substring(0, match.indexOf(':') + 2);
        return `${prefix}"[REDACTED]"`;
      });
    });
    return message;
  }

  private formatError(error: Error): object {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error as any),
    };
  }

  private addMetadata(metadata: LogMetadata = {}): LogMetadata {
    return {
      correlationId: metadata.correlationId || uuidv4(),
      timestamp: new Date().toISOString(),
      hostname: require('os').hostname(),
      pid: process.pid,
      ...metadata
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, metadata: LogMetadata = {}): void {
    const enrichedMetadata = this.addMetadata(metadata);
    const sanitizedMessage = this.sanitizeMessage(message);

    if (this.logBuffer.length < this.bufferSize) {
      this.logBuffer.push({
        level: 'info',
        message: sanitizedMessage,
        metadata: enrichedMetadata
      });
    } else {
      this.winstonLogger.info(sanitizedMessage, enrichedMetadata);
    }
  }

  public error(error: Error | string, metadata: LogMetadata = {}): void {
    const enrichedMetadata = this.addMetadata(metadata);
    const errorObject = error instanceof Error ? this.formatError(error) : { message: error };
    
    // Errors are logged immediately, bypassing the buffer
    this.winstonLogger.error(errorObject.message, {
      ...enrichedMetadata,
      error: errorObject
    });
  }

  public warn(message: string, metadata: LogMetadata = {}): void {
    const enrichedMetadata = this.addMetadata(metadata);
    const sanitizedMessage = this.sanitizeMessage(message);

    this.winstonLogger.warn(sanitizedMessage, enrichedMetadata);
  }

  public debug(message: string, metadata: LogMetadata = {}): void {
    if (process.env.NODE_ENV === 'development') {
      const enrichedMetadata = this.addMetadata(metadata);
      const sanitizedMessage = this.sanitizeMessage(message);

      this.winstonLogger.debug(sanitizedMessage, enrichedMetadata);
    }
  }

  public getTransportMetrics(): Map<string, TransportMetrics> {
    return new Map(this.transportMetrics);
  }

  public isHealthy(): boolean {
    return Array.from(this.transportMetrics.values()).every(
      metrics => metrics.failed < metrics.successful * 0.1
    );
  }
}

// Export singleton logger instance
export const logger = Logger.getInstance();