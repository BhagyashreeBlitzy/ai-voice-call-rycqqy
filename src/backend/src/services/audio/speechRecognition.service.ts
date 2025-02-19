/**
 * Speech Recognition Service
 * Handles real-time speech recognition using Google Cloud Speech-to-Text API
 * with comprehensive error handling and performance monitoring
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import * as speech from '@google-cloud/speech'; // ^5.5.0
import { Observable, Subject } from 'rxjs'; // ^7.8.1
import { AudioConfig, AudioChunk } from '../../types/audio.types';
import { speechConfig } from '../../config/speech.config';
import { AudioProcessorService } from './audioProcessor.service';
import { Result } from '../../types/common.types';

/**
 * Interface for recognition performance metrics
 */
interface RecognitionMetrics {
  latency: number;
  accuracy: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  averageProcessingTime: number;
}

/**
 * Interface for recognition results
 */
interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  stability?: number;
  timestamp: number;
}

@injectable()
export class SpeechRecognitionService {
  private readonly speechClient: speech.SpeechClient;
  private recognitionStream: speech.SpeechStream | null = null;
  private readonly audioConfig: AudioConfig;
  private readonly resultSubject: Subject<RecognitionResult>;
  private retryCount: number = 0;
  private readonly MAX_RETRIES: number = 3;
  private readonly BACKOFF_MULTIPLIER: number = 1.5;
  private readonly performanceMetrics: RecognitionMetrics;

  constructor(private readonly audioProcessor: AudioProcessorService) {
    // Initialize Google Cloud Speech client
    this.speechClient = new speech.SpeechClient({
      credentials: speechConfig.googleSpeechConfig
    });

    // Initialize configuration
    this.audioConfig = {
      sampleRate: speechConfig.sampleRate,
      frameSize: speechConfig.frameSize,
      bitDepth: speechConfig.bitDepth,
      channels: 1,
      latencyBudget: 500
    };

    // Initialize result subject for streaming
    this.resultSubject = new Subject<RecognitionResult>();

    // Initialize performance metrics
    this.performanceMetrics = {
      latency: 0,
      accuracy: 0,
      errorRate: 0,
      totalRequests: 0,
      successfulRequests: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Starts a new speech recognition stream
   * @param languageCode Language code for recognition
   * @returns Observable of recognition results
   */
  public startRecognition(languageCode: string = 'en-US'): Observable<RecognitionResult> {
    try {
      // Close existing stream if any
      this.stopRecognition();

      // Configure recognition stream
      const streamingConfig: speech.StreamingRecognizeRequest = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: this.audioConfig.sampleRate,
          languageCode,
          enableAutomaticPunctuation: true,
          model: 'latest_long',
          useEnhanced: true,
          metadata: {
            interactionType: 'VOICE_COMMAND',
            microphoneDistance: 'NEARFIELD',
            originalMediaType: 'AUDIO',
          }
        },
        interimResults: true
      };

      // Create new recognition stream
      this.recognitionStream = this.speechClient
        .streamingRecognize(streamingConfig)
        .on('error', this.handleRecognitionError.bind(this))
        .on('data', this.handleRecognitionData.bind(this))
        .on('end', () => {
          console.log('Recognition stream ended');
        });

      return this.resultSubject.asObservable();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      throw new Error('Recognition initialization failed');
    }
  }

  /**
   * Processes an audio chunk for recognition
   * @param chunk Audio chunk to process
   */
  public async processAudioChunk(chunk: AudioChunk): Promise<Result<void>> {
    const startTime = performance.now();

    try {
      if (!this.recognitionStream) {
        throw new Error('Recognition stream not initialized');
      }

      // Process audio through audio processor
      const processedResult = await this.audioProcessor.processAudioChunk(chunk);
      if (!processedResult.success) {
        throw new Error('Audio processing failed');
      }

      // Send processed audio to recognition stream
      const success = this.recognitionStream.write(processedResult.data.data);
      
      if (!success) {
        // Handle backpressure
        await new Promise(resolve => this.recognitionStream!.once('drain', resolve));
      }

      // Update metrics
      this.updateMetrics(startTime, true);

      return {
        success: true,
        data: undefined,
        error: null,
        metadata: {
          processingTime: performance.now() - startTime,
          streamBufferFull: !success
        }
      };
    } catch (error) {
      return this.handleProcessingError(error, startTime);
    }
  }

  /**
   * Stops the recognition stream
   */
  public async stopRecognition(): Promise<void> {
    if (this.recognitionStream) {
      this.recognitionStream.end();
      this.recognitionStream = null;
    }
    this.retryCount = 0;
    this.resultSubject.complete();
  }

  /**
   * Handles recognition data events
   * @param data Recognition response data
   */
  private handleRecognitionData(data: speech.v1.StreamingRecognizeResponse): void {
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const alternative = result.alternatives && result.alternatives[0];

      if (alternative) {
        this.resultSubject.next({
          transcript: alternative.transcript || '',
          confidence: alternative.confidence || 0,
          isFinal: result.isFinal || false,
          stability: result.stability,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Handles recognition stream errors
   * @param error Recognition error
   */
  private async handleRecognitionError(error: Error): Promise<void> {
    console.error('Recognition error:', error);

    if (this.retryCount < this.MAX_RETRIES) {
      this.retryCount++;
      const backoffTime = Math.pow(this.BACKOFF_MULTIPLIER, this.retryCount) * 1000;
      
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      this.startRecognition();
    } else {
      this.resultSubject.error({
        code: 'RECOGNITION_ERROR',
        message: 'Speech recognition failed after maximum retries',
        details: { error: error.message },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handles audio processing errors
   * @param error Processing error
   * @param startTime Processing start time
   */
  private handleProcessingError(error: Error, startTime: number): Result<void> {
    this.updateMetrics(startTime, false);

    return {
      success: false,
      data: undefined,
      error: {
        code: 'AUDIO_PROCESSING_ERROR',
        message: 'Failed to process audio chunk',
        details: { error: error.message },
        timestamp: Date.now()
      },
      metadata: {
        processingTime: performance.now() - startTime,
        retryCount: this.retryCount
      }
    };
  }

  /**
   * Updates performance metrics
   * @param startTime Processing start time
   * @param success Whether processing was successful
   */
  private updateMetrics(startTime: number, success: boolean): void {
    const processingTime = performance.now() - startTime;
    this.performanceMetrics.totalRequests++;
    
    if (success) {
      this.performanceMetrics.successfulRequests++;
    }

    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalRequests - 1) +
       processingTime) / this.performanceMetrics.totalRequests;

    this.performanceMetrics.latency = Math.max(
      this.performanceMetrics.latency,
      processingTime
    );

    this.performanceMetrics.errorRate =
      (this.performanceMetrics.totalRequests - this.performanceMetrics.successfulRequests) /
      this.performanceMetrics.totalRequests;

    this.performanceMetrics.accuracy =
      this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests;
  }

  /**
   * Gets current performance metrics
   * @returns Current performance metrics
   */
  public getMetrics(): Readonly<RecognitionMetrics> {
    return { ...this.performanceMetrics };
  }
}