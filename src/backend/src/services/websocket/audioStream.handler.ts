/**
 * WebSocket handler for real-time audio streaming with enhanced security and performance monitoring
 * Implements technical specifications for voice processing with comprehensive error recovery
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import { Subject, BehaviorSubject } from 'rxjs';
import { retry } from 'rxjs/operators';
import { 
  WebSocketHandler, 
  WebSocketMessage, 
  WebSocketMessageType,
  WebSocketAudioMessage,
  ErrorCategory,
  ConnectionQualityMetrics
} from '../../types/websocket.types';
import { AudioProcessor } from '../audio/audioProcessor.service';
import { SpeechRecognitionService } from '../audio/speechRecognition.service';
import { AudioChunk, AudioLevel } from '../../types/audio.types';

/**
 * Interface for stream health monitoring
 */
interface StreamHealth {
  latency: number;
  bufferSize: number;
  packetLoss: number;
  errorRate: number;
  lastUpdateTime: number;
}

/**
 * Enhanced WebSocket handler for audio streaming with security and monitoring
 */
@injectable()
export class AudioStreamHandler implements WebSocketHandler {
  private readonly audioStream: Subject<AudioChunk>;
  private readonly streamHealth: BehaviorSubject<StreamHealth>;
  private isProcessing: boolean = false;
  private messageCounter: number = 0;
  private lastMessageTimestamp: number = 0;
  private retryAttempts: number = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW = 1000; // 1 second
  private readonly MAX_MESSAGES_PER_WINDOW = 50;
  private readonly BACKOFF_MULTIPLIER = 1.5;

  constructor(
    private readonly audioProcessor: AudioProcessor,
    private readonly speechRecognition: SpeechRecognitionService
  ) {
    // Initialize audio stream with backpressure handling
    this.audioStream = new Subject<AudioChunk>();
    
    // Initialize stream health monitoring
    this.streamHealth = new BehaviorSubject<StreamHealth>({
      latency: 0,
      bufferSize: 0,
      packetLoss: 0,
      errorRate: 0,
      lastUpdateTime: Date.now()
    });

    // Set up audio stream processing pipeline
    this.audioStream
      .pipe(
        retry({
          count: this.MAX_RETRY_ATTEMPTS,
          delay: (error, retryCount) => 
            this.calculateBackoff(retryCount)
        })
      )
      .subscribe({
        next: this.processAudioChunk.bind(this),
        error: this.handleStreamError.bind(this)
      });
  }

  /**
   * Handles incoming WebSocket messages with security validation and rate limiting
   */
  public async onMessage(message: WebSocketMessage): Promise<void> {
    const startTime = performance.now();

    try {
      // Validate message rate limiting
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Process audio message
      if (message.type === WebSocketMessageType.AUDIO) {
        const audioMessage = message as WebSocketAudioMessage;
        
        // Validate sequence number and timestamp
        if (!this.validateMessageSequence(audioMessage)) {
          throw new Error('Invalid message sequence');
        }

        // Process audio chunk
        await this.processAudioChunk(audioMessage.payload);
      }

      // Update stream health metrics
      this.updateStreamHealth({
        latency: performance.now() - startTime,
        bufferSize: this.audioStream.observers.length,
        packetLoss: 0,
        errorRate: 0,
        lastUpdateTime: Date.now()
      });

    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Processes audio chunks with error recovery and performance optimization
   */
  private async processAudioChunk(chunk: AudioChunk): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Process audio through audio processor
      const processedResult = await this.audioProcessor.processAudioChunk(chunk);
      if (!processedResult.success) {
        throw new Error('Audio processing failed');
      }

      // Send to speech recognition
      const recognitionResult = await this.speechRecognition.processAudioChunk(
        processedResult.data
      );
      if (!recognitionResult.success) {
        throw new Error('Speech recognition failed');
      }

      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.updateStreamHealth({
        ...this.streamHealth.value,
        latency: processingTime,
        lastUpdateTime: Date.now()
      });

    } catch (error) {
      this.handleProcessingError(error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Enhanced error handling with recovery mechanisms
   */
  public onError(error: Error): void {
    console.error('WebSocket error:', error);

    const errorInfo = {
      code: 'WEBSOCKET_ERROR',
      category: ErrorCategory.SYSTEM,
      message: error.message,
      timestamp: Date.now(),
      retryAttempt: this.retryAttempts
    };

    // Update error metrics
    this.updateStreamHealth({
      ...this.streamHealth.value,
      errorRate: (this.streamHealth.value.errorRate + 1),
      lastUpdateTime: Date.now()
    });

    // Attempt recovery if possible
    if (this.retryAttempts < this.MAX_RETRY_ATTEMPTS) {
      this.retryAttempts++;
      setTimeout(() => {
        this.resetStreamState();
      }, this.calculateBackoff(this.retryAttempts));
    }
  }

  /**
   * Handles connection closure with resource cleanup
   */
  public onClose(): void {
    // Stop all active processes
    this.isProcessing = false;
    this.audioStream.complete();
    this.streamHealth.complete();

    // Clean up resources
    this.speechRecognition.stopRecognition();
    this.resetStreamState();

    console.log('WebSocket connection closed');
  }

  /**
   * Validates message rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastMessageTimestamp > this.RATE_LIMIT_WINDOW) {
      this.messageCounter = 0;
      this.lastMessageTimestamp = now;
    }

    this.messageCounter++;
    return this.messageCounter <= this.MAX_MESSAGES_PER_WINDOW;
  }

  /**
   * Validates message sequence and timing
   */
  private validateMessageSequence(message: WebSocketAudioMessage): boolean {
    const now = Date.now();
    const messageAge = now - message.timestamp;
    
    return (
      message.sequenceNumber > 0 &&
      messageAge < 5000 && // Message not older than 5 seconds
      message.timestamp <= now // Message not from future
    );
  }

  /**
   * Calculates exponential backoff for retries
   */
  private calculateBackoff(retryCount: number): number {
    return Math.min(
      1000 * Math.pow(this.BACKOFF_MULTIPLIER, retryCount),
      30000 // Max 30 seconds
    );
  }

  /**
   * Handles stream processing errors
   */
  private handleProcessingError(error: Error): void {
    console.error('Processing error:', error);
    
    this.updateStreamHealth({
      ...this.streamHealth.value,
      errorRate: this.streamHealth.value.errorRate + 1,
      lastUpdateTime: Date.now()
    });
  }

  /**
   * Updates stream health metrics
   */
  private updateStreamHealth(metrics: Partial<StreamHealth>): void {
    this.streamHealth.next({
      ...this.streamHealth.value,
      ...metrics
    });
  }

  /**
   * Resets stream state for recovery
   */
  private resetStreamState(): void {
    this.isProcessing = false;
    this.messageCounter = 0;
    this.lastMessageTimestamp = 0;
    this.updateStreamHealth({
      latency: 0,
      bufferSize: 0,
      packetLoss: 0,
      errorRate: 0,
      lastUpdateTime: Date.now()
    });
  }

  /**
   * Gets current stream health metrics
   */
  public getStreamHealth(): Readonly<StreamHealth> {
    return { ...this.streamHealth.value };
  }
}