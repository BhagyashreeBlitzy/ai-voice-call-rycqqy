/**
 * Central configuration module that exports all application configurations
 * with comprehensive validation, type safety, and environment-specific handling.
 * @packageDocumentation
 * @version 1.0.0
 */

import { merge } from 'lodash'; // ^4.17.21
import { z } from 'zod'; // ^3.22.0
import { EventEmitter } from 'events'; // ^3.3.0

import { defaultAudioConfig } from './audio.config';
import { i18nConfig } from './i18n.config';
import routes from './routes.config';
import { WebSocketConfig } from './websocket.config';

// Global constants
export const APP_VERSION = '1.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const CONFIG_SCHEMA_VERSION = '1.0.0';

// Configuration validation schemas
const audioConfigSchema = z.object({
  sampleRate: z.number().int().min(8000).max(48000),
  frameSize: z.number().int().min(10).max(100),
  bitDepth: z.number().int().oneOf([16, 24, 32]),
  channels: z.number().int().min(1).max(2),
  latencyBudget: z.number().int().min(0).max(500)
});

const i18nConfigSchema = z.object({
  fallbackLng: z.string(),
  supportedLngs: z.array(z.string()),
  defaultNS: z.string(),
  interpolation: z.object({
    escapeValue: z.boolean()
  })
});

const webSocketConfigSchema = z.object({
  url: z.string().url(),
  protocols: z.array(z.string()),
  heartbeatInterval: z.number().int().min(1000).max(30000),
  reconnection: z.object({
    maxAttempts: z.number().int().min(1),
    interval: z.number().int().min(100),
    maxRetryDuration: z.number().int().min(1000)
  })
});

/**
 * Configuration manager class with validation and event handling
 */
class ConfigManager {
  private currentConfig: any;
  private readonly configEvents: EventEmitter;
  private static instance: ConfigManager;

  private constructor() {
    this.configEvents = new EventEmitter();
    this.currentConfig = this.initializeConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Retrieves complete application configuration with validation
   */
  public getAppConfig(overrides: Partial<any> = {}, environment = NODE_ENV) {
    try {
      // Merge configurations with environment-specific overrides
      const config = merge(
        {},
        this.currentConfig,
        this.getEnvironmentConfig(environment),
        overrides
      );

      // Validate configuration sections
      this.validateConfig(config);

      return config;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      throw error;
    }
  }

  /**
   * Updates configuration with validation
   */
  public updateConfig(updates: Partial<any>): void {
    try {
      const newConfig = merge({}, this.currentConfig, updates);
      this.validateConfig(newConfig);
      this.currentConfig = newConfig;
      this.configEvents.emit('configUpdated', this.currentConfig);
    } catch (error) {
      console.error('Configuration update failed:', error);
      throw error;
    }
  }

  /**
   * Adds configuration change listener
   */
  public onConfigChange(listener: (config: any) => void): void {
    this.configEvents.on('configUpdated', listener);
  }

  private initializeConfig() {
    return {
      version: APP_VERSION,
      environment: NODE_ENV,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      audio: defaultAudioConfig,
      i18n: i18nConfig,
      routes,
      websocket: {
        url: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3000/ws/v1',
        protocols: ['v1.voice-stream', 'v1.events'],
        heartbeatInterval: 15000,
        reconnection: {
          maxAttempts: 5,
          interval: 1000,
          maxRetryDuration: 30000
        }
      }
    };
  }

  private getEnvironmentConfig(environment: string) {
    switch (environment) {
      case 'production':
        return {
          websocket: {
            url: process.env.REACT_APP_WEBSOCKET_URL,
            heartbeatInterval: 30000
          }
        };
      case 'staging':
        return {
          websocket: {
            url: process.env.REACT_APP_STAGING_WEBSOCKET_URL,
            heartbeatInterval: 20000
          }
        };
      default:
        return {};
    }
  }

  private validateConfig(config: any): void {
    try {
      audioConfigSchema.parse(config.audio);
      i18nConfigSchema.parse(config.i18n);
      webSocketConfigSchema.parse(config.websocket);
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export validated configurations
export const appConfig = configManager.getAppConfig();

// Export configuration types
export type AppConfig = typeof appConfig;
export type AudioConfig = typeof defaultAudioConfig;
export type I18nConfig = typeof i18nConfig;
export type WebSocketConfig = typeof appConfig.websocket;