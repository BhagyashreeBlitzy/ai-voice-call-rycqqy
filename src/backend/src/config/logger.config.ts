import winston from 'winston';
import 'winston-daily-rotate-file';

// Log levels with numeric priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

// ANSI color configuration for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
} as const;

// Configuration for log rotation
const ROTATION_CONFIG = {
  maxSize: '20m',
  maxFiles: '14d',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  auditFile: 'logs/audit.json',
  extension: '.log',
  utc: true,
} as const;

// ELK Stack configuration
const ELK_CONFIG = {
  host: process.env.ELK_HOST,
  port: process.env.ELK_PORT,
  index: 'voice-agent-logs',
  ssl: true,
  auth: {
    username: process.env.ELK_USERNAME,
    password: process.env.ELK_PASSWORD,
  },
  metadata: {
    service: 'voice-agent',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
  format: {
    includeTimestamp: true,
    includeCorrelationId: true,
    includeStackTrace: true,
    sanitize: true,
  },
} as const;

// Determine appropriate log level based on environment
const getLogLevel = (): string => {
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info';
};

// Custom format for development environment
const developmentFormat = winston.format.combine(
  winston.format.colorize({ colors: LOG_COLORS }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const reqId = correlationId ? ` [${correlationId}]` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}${reqId}: ${message}${metaStr}`;
  })
);

// Custom format for production environment
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Development environment configuration
const developmentTransports = [
  new winston.transports.Console({
    handleExceptions: true,
    handleRejections: true,
    format: developmentFormat,
  }),
];

// Production environment configuration
const productionTransports = [
  new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    ...ROTATION_CONFIG,
    format: productionFormat,
  }),
  new winston.transports.Console({
    level: 'error',
    handleExceptions: true,
    handleRejections: true,
    format: winston.format.simple(),
  }),
];

// If ELK host is configured, add Elasticsearch transport for production
if (process.env.NODE_ENV === 'production' && process.env.ELK_HOST) {
  const { ElasticsearchTransport } = require('winston-elasticsearch');
  productionTransports.push(
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: ELK_CONFIG,
      bufferSize: 1000,
      flushInterval: 5000,
      retryLimit: 3,
    })
  );
}

// Export the logger configuration
export const loggerConfig = {
  levels: LOG_LEVELS,
  level: getLogLevel(),
  format: process.env.NODE_ENV === 'development' ? developmentFormat : productionFormat,
  transports: process.env.NODE_ENV === 'development' ? developmentTransports : productionTransports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test',
  // Add correlation ID to all log entries
  defaultMeta: {
    service: 'voice-agent',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
};

// Export individual components for testing and customization
export {
  LOG_LEVELS,
  LOG_COLORS,
  ROTATION_CONFIG,
  ELK_CONFIG,
  getLogLevel,
  developmentFormat,
  productionFormat,
};