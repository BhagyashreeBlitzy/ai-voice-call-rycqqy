/**
 * Enhanced API Service
 * Handles all HTTP communication between frontend and backend with comprehensive security,
 * performance optimizations, and specialized audio processing support.
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  API_BASE_URL,
  HTTP_METHODS,
  HTTP_HEADERS,
  CONTENT_TYPES,
  HTTP_STATUS
} from '../constants/api.constants';

// Type definitions for enhanced type safety
interface AudioConfig extends AxiosRequestConfig {
  chunkSize?: number;
  mimeType: string;
  sampleRate?: number;
}

interface AudioResponse {
  data: ArrayBuffer;
  metadata: {
    duration: number;
    format: string;
    sampleRate: number;
  };
}

interface RequestQueueItem {
  priority: number;
  timestamp: number;
  controller: AbortController;
}

class ApiService {
  private readonly axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private readonly requestControllers: Map<string, AbortController>;
  private readonly requestQueue: Map<string, RequestQueueItem>;
  private readonly responseCache: Map<string, { data: any; timestamp: number }>;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_RETRIES = 3;
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.requestControllers = new Map();
    this.requestQueue = new Map();
    this.responseCache = new Map();

    // Initialize axios instance with enhanced configuration
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: ApiService.REQUEST_TIMEOUT,
      headers: {
        [HTTP_HEADERS.ACCEPT]: CONTENT_TYPES.JSON,
        [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON
      }
    });

    this.configureInterceptors();
  }

  /**
   * Configures request and response interceptors with enhanced security and error handling
   */
  private configureInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = crypto.randomUUID();
        config.headers[HTTP_HEADERS.X_REQUEST_ID] = requestId;

        if (this.authToken) {
          config.headers[HTTP_HEADERS.AUTHORIZATION] = `Bearer ${this.authToken}`;
        }

        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
          config.headers[HTTP_HEADERS.X_CSRF_TOKEN] = csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );
  }

  /**
   * Sets the authentication token for subsequent requests
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Performs a GET request with caching and error handling
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = `${url}${JSON.stringify(config?.params || {})}`;
    const cachedResponse = this.responseCache.get(cacheKey);

    if (cachedResponse && Date.now() - cachedResponse.timestamp < ApiService.CACHE_DURATION) {
      return cachedResponse.data;
    }

    const response = await this.axiosInstance.get<T>(url, config);
    this.responseCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response.data;
  }

  /**
   * Performs a POST request with enhanced error handling
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Specialized method for sending audio data with appropriate handling
   */
  public async postAudioData(
    url: string,
    audioData: ArrayBuffer,
    config: AudioConfig
  ): Promise<AudioResponse> {
    const controller = new AbortController();
    this.requestControllers.set(url, controller);

    try {
      const response = await this.axiosInstance.post<AudioResponse>(url, audioData, {
        ...config,
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: config.mimeType,
          'Content-Length': audioData.byteLength.toString()
        },
        signal: controller.signal,
        responseType: 'arraybuffer',
        onUploadProgress: (progressEvent) => {
          config.onUploadProgress?.(progressEvent);
        }
      });

      return response.data;
    } finally {
      this.requestControllers.delete(url);
    }
  }

  /**
   * Performs a PUT request
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a DELETE request
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Enhanced error handling with retry logic and specific error types
   */
  private async handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      switch (error.response.status) {
        case HTTP_STATUS.UNAUTHORIZED:
          // Handle token refresh or logout
          this.setAuthToken(null);
          throw new Error('Authentication required');

        case HTTP_STATUS.TOO_MANY_REQUESTS:
          const retryAfter = error.response.headers['retry-after'];
          throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);

        case HTTP_STATUS.SERVICE_UNAVAILABLE:
          // Implement exponential backoff retry
          if (error.config && error.config.retryCount < ApiService.MAX_RETRIES) {
            error.config.retryCount = (error.config.retryCount || 0) + 1;
            const backoffDelay = Math.pow(2, error.config.retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            return this.axiosInstance(error.config);
          }
          break;
      }
    }

    // Network errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }

    throw new Error(error.message || 'An unexpected error occurred');
  }

  /**
   * Cancels an ongoing request
   */
  public cancelRequest(url: string): void {
    const controller = this.requestControllers.get(url);
    if (controller) {
      controller.abort();
      this.requestControllers.delete(url);
    }
  }

  /**
   * Clears the response cache
   */
  public clearCache(): void {
    this.responseCache.clear();
  }
}

export const apiService = new ApiService();