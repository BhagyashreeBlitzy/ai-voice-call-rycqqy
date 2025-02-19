import { PrismaClient } from '@prisma/client'; // v5.0.0
import { DatabaseConfig } from '../types/config.types';

/**
 * Validates database configuration parameters
 * @param config Database configuration object
 * @throws Error if configuration is invalid
 */
const validateDatabaseConfig = (config: DatabaseConfig): boolean => {
  // Validate required fields
  if (!config.host || !config.username || !config.password || !config.database) {
    throw new Error('Missing required database configuration parameters');
  }

  // Validate port number
  if (config.port < 1024 || config.port > 65535) {
    throw new Error('Database port must be between 1024 and 65535');
  }

  // Validate pool configuration
  if (config.poolConfig) {
    if (config.poolConfig.min < 0 || config.poolConfig.max < config.poolConfig.min) {
      throw new Error('Invalid pool configuration');
    }
  }

  // Validate replica configuration
  if (config.replicaConfig) {
    if (!Array.isArray(config.replicaConfig.hosts) || config.replicaConfig.hosts.length === 0) {
      throw new Error('Invalid replica configuration');
    }
  }

  return true;
};

/**
 * Retrieves and validates database configuration from environment variables
 * @returns Validated DatabaseConfig object
 */
const getDatabaseConfig = (): DatabaseConfig => {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || '',
    ssl: process.env.DB_SSL === 'true',
    poolConfig: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10)
    },
    replicaConfig: process.env.DB_REPLICA_ENABLED === 'true' ? {
      hosts: (process.env.DB_REPLICA_HOSTS || '').split(','),
      readPreference: process.env.DB_REPLICA_READ_PREFERENCE || 'nearest'
    } : undefined
  };

  validateDatabaseConfig(config);
  return config;
};

// Initialize database configuration
export const databaseConfig = getDatabaseConfig();

// Initialize Prisma client with enhanced configuration
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://${databaseConfig.username}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}${databaseConfig.ssl ? '?sslmode=require' : ''}`
    }
  },
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' }
  ],
  // Configure connection pooling
  connection: {
    pool: {
      min: databaseConfig.poolConfig.min,
      max: databaseConfig.poolConfig.max,
      idle: databaseConfig.poolConfig.idle,
      acquire: databaseConfig.poolConfig.acquire
    }
  },
  // Enable replication support if configured
  replication: databaseConfig.replicaConfig ? {
    enabled: true,
    hosts: databaseConfig.replicaConfig.hosts,
    readPreference: databaseConfig.replicaConfig.readPreference
  } : undefined
});

// Error handling for Prisma client
prisma.$on('error', (e) => {
  console.error('Prisma Client Error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Client Warning:', e);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});