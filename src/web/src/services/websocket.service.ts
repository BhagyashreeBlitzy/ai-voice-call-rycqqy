/**
 * @fileoverview Advanced WebSocket service for secure real-time voice communication
 * Implements secure WSS protocol with comprehensive error handling and monitoring
 * @version 1.0.0
 */

import { WebSocket } from 'typescript'; // v5.0.0
import * as CryptoJS from 'crypto-js'; // v4.1.1
import * as pako from 'pako'; // v2.1.0

import { 
    WebSocketState,
    WebSocketMessage,
    WebSocketAudioMessage,
    WebSocketErrorMessage,
    WebSocketHeartbeatMessage,
    isAudioMessage,
    isErrorMessage
} from '../types/websocket.types';

import { WebSocketConfig, ReconnectionConfig } from '../config/websocket.config';
import { AudioChunk, AudioFormat } from '../types/audio.types';
import { 
    WEBSOCKET_DEFAULTS,
    WEBSOCKET_EVENTS,
    WEBSOCKET_ERROR_CODES,
    WEBSOCKET_STATUS,
    WEBSOCKET_SECURITY,
    WEBSOCKET_PERFORMANCE
} from '../constants/websocket.constants';

/**
 * Advanced WebSocket service class for secure real-time communication
 * Implements WSS protocol with encryption, compression, and monitoring
 */
export class WebSocketService {
    private connection: WebSocket | null = null;
    private connectionState: WebSocketState = WebSocketState.DISCONNECTED;
    private reconnectAttempts: number = 0;
    private heartbeatInterval: NodeJS.Timer | null = null;
    private messageQueue: Map<string, WebSocketMessage> = new Map();
    private pendingMessages: Set<string> = new Set();
    private metrics: {
        latency: number[];
        messagesSent: number;
        messagesReceived: number;
        errors: number;
        startTime: number;
    };
    private readonly config: WebSocketConfig;
    private encryptionKey: CryptoJS.lib.WordArray;

    /**
     * Initializes WebSocket service with enhanced configuration
     * @param config - WebSocket configuration parameters
     */
    constructor(config: WebSocketConfig) {
        this.config = config;
        this.encryptionKey = CryptoJS.lib.WordArray.random(32); // 256-bit key
        this.metrics = {
            latency: [],
            messagesSent: 0,
            messagesReceived: 0,
            errors: 0,
            startTime: Date.now()
        };
    }

    /**
     * Establishes secure WebSocket connection with retry logic
     * @param sessionId - Active session identifier
     * @returns Promise resolving when connection is established
     */
    public async connect(sessionId: string): Promise<void> {
        if (this.connection) {
            return;
        }

        this.connectionState = WebSocketState.CONNECTING;
        
        try {
            this.connection = new WebSocket(this.config.url, this.config.protocols);
            
            this.connection.onopen = this.handleOpen.bind(this);
            this.connection.onmessage = this.handleMessage.bind(this);
            this.connection.onerror = this.handleError.bind(this);
            this.connection.onclose = this.handleClose.bind(this);

            await this.waitForConnection();
            this.startHeartbeat();
        } catch (error) {
            this.handleConnectionError(error);
        }
    }

    /**
     * Sends encrypted audio chunk with delivery guarantees
     * @param audioChunk - Audio data chunk to send
     * @returns Promise resolving when chunk is delivered
     */
    public async sendAudioChunk(audioChunk: AudioChunk): Promise<void> {
        if (!this.connection || this.connectionState !== WebSocketState.CONNECTED) {
            throw new Error(WEBSOCKET_ERROR_CODES.CONNECTION_ERROR);
        }

        const message: WebSocketAudioMessage = {
            type: 'audio',
            payload: audioChunk,
            timestamp: Date.now(),
            messageId: crypto.randomUUID(),
            sequenceNumber: this.metrics.messagesSent + 1
        };

        try {
            const compressedData = this.compressMessage(message);
            const encryptedData = this.encryptMessage(compressedData);
            
            await this.sendWithRetry(encryptedData, message.messageId);
            this.metrics.messagesSent++;
        } catch (error) {
            this.metrics.errors++;
            throw error;
        }
    }

    /**
     * Gracefully closes WebSocket connection
     */
    public disconnect(): void {
        if (this.connection) {
            this.stopHeartbeat();
            this.connection.close(WEBSOCKET_STATUS.NORMAL_CLOSURE);
            this.connection = null;
            this.connectionState = WebSocketState.DISCONNECTED;
        }
    }

    /**
     * Returns current connection metrics
     */
    public getMetrics() {
        const uptime = (Date.now() - this.metrics.startTime) / 1000;
        const avgLatency = this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length;

        return {
            uptime,
            avgLatency,
            messagesSent: this.metrics.messagesSent,
            messagesReceived: this.metrics.messagesReceived,
            errors: this.metrics.errors,
            connectionState: this.connectionState
        };
    }

    /**
     * Handles incoming WebSocket messages with decryption
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const decryptedData = this.decryptMessage(event.data);
            const decompressedData = this.decompressMessage(decryptedData);
            const message: WebSocketMessage = JSON.parse(decompressedData);

            if (isAudioMessage(message)) {
                this.handleAudioMessage(message);
            } else if (isErrorMessage(message)) {
                this.handleErrorMessage(message);
            }

            this.metrics.messagesReceived++;
            this.updateLatency(message.timestamp);
        } catch (error) {
            this.metrics.errors++;
            this.handleError(error);
        }
    }

    /**
     * Implements reliable message delivery with retries
     */
    private async sendWithRetry(data: string, messageId: string, attempts: number = 0): Promise<void> {
        const maxAttempts = this.config.reconnection.maxAttempts;
        
        try {
            if (!this.connection) throw new Error(WEBSOCKET_ERROR_CODES.CONNECTION_ERROR);
            
            this.pendingMessages.add(messageId);
            this.connection.send(data);

            await this.waitForAck(messageId);
            this.pendingMessages.delete(messageId);
        } catch (error) {
            if (attempts < maxAttempts) {
                const backoff = Math.min(
                    this.config.reconnection.interval * Math.pow(2, attempts),
                    this.config.reconnection.maxRetryDuration
                );
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this.sendWithRetry(data, messageId, attempts + 1);
            }
            throw error;
        }
    }

    /**
     * Encrypts message using AES-256-GCM
     */
    private encryptMessage(data: string): string {
        const iv = CryptoJS.lib.WordArray.random(12);
        const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
            iv,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.NoPadding
        });
        
        return JSON.stringify({
            ciphertext: encrypted.ciphertext.toString(),
            iv: iv.toString()
        });
    }

    /**
     * Decrypts message using AES-256-GCM
     */
    private decryptMessage(encryptedData: string): string {
        const { ciphertext, iv } = JSON.parse(encryptedData);
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: CryptoJS.enc.Hex.parse(ciphertext) },
            this.encryptionKey,
            { iv: CryptoJS.enc.Hex.parse(iv) }
        );
        
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    /**
     * Compresses message using deflate algorithm
     */
    private compressMessage(data: any): string {
        const jsonString = JSON.stringify(data);
        if (jsonString.length < this.config.compression.threshold) {
            return jsonString;
        }
        return pako.deflate(jsonString, { to: 'string' });
    }

    /**
     * Decompresses message using deflate algorithm
     */
    private decompressMessage(data: string): string {
        try {
            return pako.inflate(data, { to: 'string' });
        } catch {
            return data; // Return as-is if not compressed
        }
    }

    /**
     * Maintains connection health with heartbeat mechanism
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.connectionState === WebSocketState.CONNECTED) {
                const heartbeat: WebSocketHeartbeatMessage = {
                    type: 'heartbeat',
                    payload: {
                        clientTime: Date.now(),
                        uptime: (Date.now() - this.metrics.startTime) / 1000
                    },
                    timestamp: Date.now(),
                    messageId: crypto.randomUUID()
                };
                
                this.sendWithRetry(
                    this.encryptMessage(this.compressMessage(heartbeat)),
                    heartbeat.messageId
                ).catch(this.handleError.bind(this));
            }
        }, this.config.heartbeatInterval);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private updateLatency(messageTimestamp: number): void {
        const latency = Date.now() - messageTimestamp;
        this.metrics.latency.push(latency);
        
        // Keep only last 100 measurements
        if (this.metrics.latency.length > 100) {
            this.metrics.latency.shift();
        }

        // Check latency threshold
        if (latency > WEBSOCKET_PERFORMANCE.MAX_LATENCY) {
            this.handleError(new Error(WEBSOCKET_ERROR_CODES.RATE_LIMIT_EXCEEDED));
        }
    }

    private async waitForConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(WEBSOCKET_ERROR_CODES.CONNECTION_ERROR));
            }, this.config.reconnection.maxRetryDuration);

            const checkConnection = () => {
                if (this.connectionState === WebSocketState.CONNECTED) {
                    clearTimeout(timeout);
                    resolve();
                } else if (this.connectionState === WebSocketState.DISCONNECTED) {
                    clearTimeout(timeout);
                    reject(new Error(WEBSOCKET_ERROR_CODES.CONNECTION_ERROR));
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    }

    private handleConnectionError(error: Error): void {
        this.metrics.errors++;
        this.connectionState = WebSocketState.DISCONNECTED;
        throw error;
    }

    private handleOpen(): void {
        this.connectionState = WebSocketState.CONNECTED;
        this.reconnectAttempts = 0;
    }

    private handleClose(event: CloseEvent): void {
        this.stopHeartbeat();
        this.connectionState = WebSocketState.DISCONNECTED;
        
        if (event.code !== WEBSOCKET_STATUS.NORMAL_CLOSURE) {
            this.handleReconnection();
        }
    }

    private async handleReconnection(): Promise<void> {
        if (this.reconnectAttempts < this.config.reconnection.maxAttempts) {
            this.reconnectAttempts++;
            this.connectionState = WebSocketState.RECONNECTING;
            
            const backoff = Math.min(
                this.config.reconnection.interval * Math.pow(2, this.reconnectAttempts - 1),
                this.config.reconnection.maxRetryDuration
            );
            
            await new Promise(resolve => setTimeout(resolve, backoff));
            await this.connect(this.config.url);
        }
    }
}