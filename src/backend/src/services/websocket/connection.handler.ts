/**
 * WebSocket Connection Handler
 * Manages secure WebSocket connections with comprehensive monitoring and error handling
 * Implements <500ms latency for real-time audio streaming
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { WebSocket } from 'ws';  // ^8.13.0
import { Logger } from 'winston';  // ^3.8.0
import { RateLimit } from 'ws-rate-limit';  // ^2.0.0
import { 
  WebSocketState, 
  WebSocketMessage,
  WebSocketMessageType,
  ConnectionQualityMetrics,
  ErrorCategory
} from '../../types/websocket.types';
import { JWTService } from '../auth/jwt.service';
import { AudioStreamHandler } from './audioStream.handler';
import { createError } from '../../utils/error.utils';
import { logger } from '../../utils/logger.utils';

/**
 * Interface for connection monitoring metrics
 */
interface ConnectionMetrics {
  activeConnections: number;
  totalConnections: number;
  errorCount: number;
  averageLatency: number;
  messageCount: number;
  lastHeartbeat: number;
}

@injectable()
export class ConnectionHandler {
  private connections: Map<string, WebSocket>;
  private state: WebSocketState;
  private metrics: ConnectionMetrics;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
  private readonly CONNECTION_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly audioStreamHandler: AudioStreamHandler,
    private readonly rateLimit: RateLimit
  ) {
    this.connections = new Map();
    this.state = WebSocketState.CONNECTING;
    this.metrics = {
      activeConnections: 0,
      totalConnections: 0,
      errorCount: 0,
      averageLatency: 0,
      messageCount: 0,
      lastHeartbeat: Date.now()
    };

    // Configure rate limiting
    this.rateLimit.setOptions({
      windowMs: 60000, // 1 minute
      max: 100 // max 100 messages per minute
    });

    // Start metrics monitoring
    this.startMetricsMonitoring();
  }

  /**
   * Handles new WebSocket connection with security validation
   */
  public async handleConnection(ws: WebSocket, request: any): Promise<void> {
    const startTime = performance.now();
    const connectionId = crypto.randomUUID();

    try {
      // Validate JWT token
      const token = this.extractToken(request);
      const tokenValidation = await JWTService.verifyToken(token);
      if (!tokenValidation.success) {
        throw createError('AUTH_ERROR', { message: 'Invalid token' });
      }

      // Apply rate limiting
      if (this.rateLimit.isRateLimited(request)) {
        throw createError('RATE_LIMIT_ERROR', { message: 'Rate limit exceeded' });
      }

      // Set up connection
      ws.binaryType = 'arraybuffer';
      ws.connectionId = connectionId;
      this.connections.set(connectionId, ws);

      // Configure WebSocket
      ws.on('message', (data: WebSocket.Data) => this.handleMessage(connectionId, data));
      ws.on('close', (code: number, reason: string) => this.handleClose(connectionId, code, reason));
      ws.on('error', (error: Error) => this.handleError(connectionId, error));
      ws.on('pong', () => this.updateHeartbeat(connectionId));

      // Initialize audio stream handler
      await this.audioStreamHandler.handleConnection(ws);

      // Update metrics
      this.updateConnectionMetrics(true);
      this.state = WebSocketState.CONNECTED;

      // Start heartbeat
      this.startHeartbeat(ws);

      logger.info('WebSocket connection established', {
        connectionId,
        setupTime: performance.now() - startTime
      });

    } catch (error) {
      logger.error('Connection setup failed', { error, connectionId });
      ws.close(1008, error.message);
      this.updateConnectionMetrics(false);
    }
  }

  /**
   * Handles incoming WebSocket messages with validation and routing
   */
  private async handleMessage(connectionId: string, data: WebSocket.Data): Promise<void> {
    const startTime = performance.now();

    try {
      const ws = this.connections.get(connectionId);
      if (!ws) {
        throw createError('WEBSOCKET_ERROR', { message: 'Connection not found' });
      }

      // Validate message size
      if (data.length > this.MAX_MESSAGE_SIZE) {
        throw createError('VALIDATION_ERROR', { message: 'Message too large' });
      }

      // Parse and validate message
      const message = this.parseMessage(data);
      if (!message) {
        throw createError('VALIDATION_ERROR', { message: 'Invalid message format' });
      }

      // Route message based on type
      switch (message.type) {
        case WebSocketMessageType.AUDIO:
          await this.audioStreamHandler.handleAudioMessage(connectionId, message);
          break;
        case WebSocketMessageType.HEARTBEAT:
          this.handleHeartbeat(connectionId, message);
          break;
        default:
          throw createError('VALIDATION_ERROR', { message: 'Unsupported message type' });
      }

      // Update metrics
      this.updateMessageMetrics(performance.now() - startTime);

    } catch (error) {
      this.handleError(connectionId, error);
    }
  }

  /**
   * Handles WebSocket connection closure
   */
  private handleClose(connectionId: string, code: number, reason: string): void {
    try {
      // Clean up connection
      const ws = this.connections.get(connectionId);
      if (ws) {
        ws.terminate();
        this.connections.delete(connectionId);
      }

      // Update metrics
      this.updateConnectionMetrics(false);
      this.state = WebSocketState.DISCONNECTED;

      logger.info('WebSocket connection closed', {
        connectionId,
        code,
        reason
      });

    } catch (error) {
      logger.error('Error during connection closure', {
        error,
        connectionId
      });
    }
  }

  /**
   * Handles WebSocket errors with recovery attempts
   */
  private handleError(connectionId: string, error: Error): void {
    this.metrics.errorCount++;

    logger.error('WebSocket error', {
      error,
      connectionId,
      metrics: this.metrics
    });

    const ws = this.connections.get(connectionId);
    if (ws) {
      ws.close(1011, error.message);
    }
  }

  /**
   * Starts heartbeat monitoring for connection health
   */
  private startHeartbeat(ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        this.checkConnectionHealth(ws);
      } else {
        clearInterval(interval);
      }
    }, this.HEARTBEAT_INTERVAL);

    ws.on('close', () => clearInterval(interval));
  }

  /**
   * Updates connection heartbeat timestamp
   */
  private updateHeartbeat(connectionId: string): void {
    this.metrics.lastHeartbeat = Date.now();
  }

  /**
   * Checks connection health and terminates stale connections
   */
  private checkConnectionHealth(ws: WebSocket): void {
    const lastHeartbeat = this.metrics.lastHeartbeat;
    if (Date.now() - lastHeartbeat > this.CONNECTION_TIMEOUT) {
      ws.terminate();
      logger.warn('Connection terminated due to timeout', {
        connectionId: ws.connectionId,
        lastHeartbeat
      });
    }
  }

  /**
   * Starts periodic metrics monitoring
   */
  private startMetricsMonitoring(): void {
    setInterval(() => {
      logger.info('WebSocket metrics', {
        metrics: this.metrics,
        state: this.state
      });
    }, 60000); // Log metrics every minute
  }

  /**
   * Updates connection metrics
   */
  private updateConnectionMetrics(isNewConnection: boolean): void {
    if (isNewConnection) {
      this.metrics.activeConnections++;
      this.metrics.totalConnections++;
    } else {
      this.metrics.activeConnections--;
    }
  }

  /**
   * Updates message processing metrics
   */
  private updateMessageMetrics(processingTime: number): void {
    this.metrics.messageCount++;
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.messageCount - 1) + processingTime) / 
      this.metrics.messageCount;
  }

  /**
   * Extracts JWT token from request
   */
  private extractToken(request: any): string {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('AUTH_ERROR', { message: 'Missing or invalid authorization header' });
    }
    return authHeader.substring(7);
  }

  /**
   * Parses and validates WebSocket message
   */
  private parseMessage(data: WebSocket.Data): WebSocketMessage | null {
    try {
      const message = JSON.parse(data.toString());
      if (!message.type || !Object.values(WebSocketMessageType).includes(message.type)) {
        return null;
      }
      return message;
    } catch {
      return null;
    }
  }

  /**
   * Gets current connection metrics
   */
  public getMetrics(): Readonly<ConnectionMetrics> {
    return { ...this.metrics };
  }
}