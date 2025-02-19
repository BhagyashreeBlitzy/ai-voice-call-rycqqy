/**
 * WebSocket Service Implementation
 * Manages real-time voice communication with enhanced security, monitoring, and performance optimization
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { WebSocket } from 'ws';
import { Logger } from 'winston';
import { WebSocketState } from '../../types/websocket.types';
import { ConnectionHandler } from './connection.handler';
import { AudioStreamHandler } from './audioStream.handler';
import { logger } from '../../utils/logger.utils';

/**
 * Interface for WebSocket performance metrics
 */
interface PerformanceMetrics {
  activeConnections: number;
  messageLatency: number;
  errorRate: number;
  throughput: number;
  bufferSize: number;
  lastUpdate: number;
}

/**
 * Interface for WebSocket security manager
 */
interface SecurityManager {
  validateConnection: (request: any) => Promise<boolean>;
  encryptMessage: (data: any) => Promise<Buffer>;
  decryptMessage: (data: Buffer) => Promise<any>;
  validateToken: (token: string) => Promise<boolean>;
}

/**
 * Interface for WebSocket health monitor
 */
interface HealthMonitor {
  checkHealth: () => Promise<boolean>;
  getMetrics: () => PerformanceMetrics;
  logHealthStatus: () => void;
}

@injectable()
export class WebSocketService {
  private server: WebSocket.Server;
  private readonly connectionPool: Map<string, WebSocket>;
  private readonly metrics: PerformanceMetrics;
  private readonly securityManager: SecurityManager;
  private readonly healthMonitor: HealthMonitor;
  private state: WebSocketState = WebSocketState.DISCONNECTED;

  constructor(
    private readonly connectionHandler: ConnectionHandler,
    private readonly audioStreamHandler: AudioStreamHandler
  ) {
    this.connectionPool = new Map();
    this.metrics = {
      activeConnections: 0,
      messageLatency: 0,
      errorRate: 0,
      throughput: 0,
      bufferSize: 0,
      lastUpdate: Date.now()
    };

    this.initializeSecurityManager();
    this.initializeHealthMonitor();
  }

  /**
   * Initializes the WebSocket server with enhanced security and performance features
   */
  public async initialize(config: any): Promise<void> {
    try {
      // Initialize WebSocket server with secure configuration
      this.server = new WebSocket.Server({
        port: config.port,
        perMessageDeflate: true,
        maxPayload: 1024 * 1024, // 1MB max message size
        clientTracking: true,
        verifyClient: async (info, callback) => {
          try {
            const isValid = await this.securityManager.validateConnection(info);
            callback(isValid);
          } catch (error) {
            logger.error('Connection validation failed:', error);
            callback(false);
          }
        }
      });

      // Set up server event handlers
      this.server.on('connection', this.handleConnection.bind(this));
      this.server.on('error', this.handleServerError.bind(this));
      this.server.on('close', this.handleServerClose.bind(this));

      // Start health monitoring
      this.startHealthMonitoring();

      this.state = WebSocketState.CONNECTING;
      logger.info('WebSocket server initialized', { port: config.port });
    } catch (error) {
      logger.error('WebSocket server initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handles new WebSocket connections with security validation
   */
  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    try {
      const connectionId = crypto.randomUUID();
      
      // Validate connection and set up handlers
      await this.connectionHandler.handleConnection(ws, request);
      
      // Set up message encryption
      ws.on('message', async (data: WebSocket.Data) => {
        try {
          const decryptedData = await this.securityManager.decryptMessage(data as Buffer);
          await this.audioStreamHandler.onMessage(decryptedData);
        } catch (error) {
          logger.error('Message processing failed:', error);
          ws.close(1008, 'Message processing failed');
        }
      });

      // Add to connection pool
      this.connectionPool.set(connectionId, ws);
      this.metrics.activeConnections = this.connectionPool.size;

      this.state = WebSocketState.CONNECTED;
      logger.info('New WebSocket connection established', { connectionId });
    } catch (error) {
      logger.error('Connection handling failed:', error);
      ws.close(1011, 'Connection handling failed');
    }
  }

  /**
   * Handles server-level errors
   */
  private handleServerError(error: Error): void {
    logger.error('WebSocket server error:', error);
    this.metrics.errorRate++;
    this.healthMonitor.logHealthStatus();
  }

  /**
   * Handles server shutdown
   */
  private handleServerClose(): void {
    this.state = WebSocketState.DISCONNECTED;
    logger.info('WebSocket server closed');
  }

  /**
   * Initializes security manager with encryption and validation
   */
  private initializeSecurityManager(): void {
    this.securityManager = {
      validateConnection: async (request: any) => {
        const token = request.headers.authorization?.split(' ')[1];
        return token ? this.securityManager.validateToken(token) : false;
      },
      encryptMessage: async (data: any) => {
        // Implement message encryption
        return Buffer.from(JSON.stringify(data));
      },
      decryptMessage: async (data: Buffer) => {
        // Implement message decryption
        return JSON.parse(data.toString());
      },
      validateToken: async (token: string) => {
        // Implement token validation
        return true; // Replace with actual validation
      }
    };
  }

  /**
   * Initializes health monitoring system
   */
  private initializeHealthMonitor(): void {
    this.healthMonitor = {
      checkHealth: async () => {
        return this.state === WebSocketState.CONNECTED;
      },
      getMetrics: () => this.metrics,
      logHealthStatus: () => {
        logger.info('WebSocket health status:', {
          metrics: this.metrics,
          state: this.state
        });
      }
    };
  }

  /**
   * Starts periodic health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.healthMonitor.checkHealth()
        .then(isHealthy => {
          if (!isHealthy) {
            logger.warn('WebSocket server health check failed');
          }
          this.healthMonitor.logHealthStatus();
        })
        .catch(error => {
          logger.error('Health check failed:', error);
        });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Gracefully shuts down the WebSocket server
   */
  public async shutdown(): Promise<void> {
    try {
      // Close all active connections
      for (const [id, ws] of this.connectionPool) {
        ws.close(1000, 'Server shutdown');
        this.connectionPool.delete(id);
      }

      // Close the server
      this.server.close(() => {
        this.state = WebSocketState.DISCONNECTED;
        logger.info('WebSocket server shut down successfully');
      });
    } catch (error) {
      logger.error('Error during server shutdown:', error);
      throw error;
    }
  }
}