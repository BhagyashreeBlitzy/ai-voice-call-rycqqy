/**
 * Authentication Service
 * Handles user authentication, token management, and session security
 * @version 1.0.0
 */

import { apiService } from './api.service';
import jwtDecode from 'jwt-decode';
import CryptoJS from 'crypto-js';
import { API_ENDPOINTS } from '../constants/api.constants';

// Type definitions for enhanced type safety
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserCredentials {
  email: string;
  password: string;
  deviceId?: string;
}

interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
}

interface SecurityConfig {
  tokenRefreshThreshold: number;
  maxRefreshAttempts: number;
  encryptionKey: string;
}

type SecurityEventType = 'token_expired' | 'token_invalid' | 'session_terminated';

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details?: any;
}

export class AuthService {
  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'auth_access_token',
    REFRESH_TOKEN: 'auth_refresh_token',
  };

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private readonly maxRefreshAttempts: number;
  private currentRefreshAttempts: number = 0;
  private readonly encryptionKey: string;

  constructor(
    private readonly apiService: typeof apiService,
    config: SecurityConfig
  ) {
    this.maxRefreshAttempts = config.maxRefreshAttempts;
    this.encryptionKey = config.encryptionKey;
    this.initializeFromStorage();
  }

  /**
   * Initializes authentication state from secure storage
   */
  private initializeFromStorage(): void {
    try {
      const encryptedAccess = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
      const encryptedRefresh = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);

      if (encryptedAccess && encryptedRefresh) {
        this.accessToken = this.decryptToken(encryptedAccess);
        this.refreshToken = this.decryptToken(encryptedRefresh);
        this.apiService.setAuthToken(this.accessToken);
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      console.error('Error initializing auth state:', error);
      this.clearTokens();
    }
  }

  /**
   * Authenticates user with credentials and establishes secure session
   */
  public async login(credentials: UserCredentials): Promise<{ user: any; tokens: AuthTokens }> {
    try {
      const response = await this.apiService.post<{ user: any; tokens: AuthTokens }>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      const { tokens, user } = response;
      this.setTokens(tokens);
      this.scheduleTokenRefresh();

      return { user, tokens };
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Securely refreshes access token with retry mechanism
   */
  private async refreshAccessToken(): Promise<AuthTokens> {
    if (this.isRefreshing || !this.refreshToken) {
      throw new Error('Token refresh failed');
    }

    try {
      this.isRefreshing = true;
      this.currentRefreshAttempts++;

      const response = await this.apiService.post<AuthTokens>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refreshToken: this.refreshToken }
      );

      this.setTokens(response);
      this.currentRefreshAttempts = 0;
      return response;
    } catch (error) {
      if (this.currentRefreshAttempts >= this.maxRefreshAttempts) {
        this.handleSecurityEvent({ 
          type: 'token_expired',
          timestamp: Date.now()
        });
        await this.logout();
      }
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Securely terminates user session and cleans up authentication state
   */
  public async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.apiService.post(API_ENDPOINTS.AUTH.LOGOUT, {
          refreshToken: this.refreshToken
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      this.apiService.setAuthToken(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  /**
   * Verifies current authentication state with token validation
   */
  public isAuthenticated(): boolean {
    if (!this.accessToken) return false;

    try {
      const payload = jwtDecode<TokenPayload>(this.accessToken);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Processes security events and takes appropriate actions
   */
  public async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    console.warn('Security event detected:', event);

    switch (event.type) {
      case 'token_expired':
      case 'token_invalid':
        if (this.isAuthenticated()) {
          await this.logout();
        }
        break;
      case 'session_terminated':
        await this.logout();
        break;
    }

    // Emit security event for monitoring
    window.dispatchEvent(new CustomEvent('auth:security', { detail: event }));
  }

  /**
   * Schedules token refresh before expiration
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (!this.accessToken) return;

    try {
      const payload = jwtDecode<TokenPayload>(this.accessToken);
      const expiresIn = payload.exp * 1000 - Date.now();
      const refreshTime = expiresIn - 60000; // Refresh 1 minute before expiry

      if (refreshTime > 0) {
        this.refreshTimeout = setTimeout(() => {
          this.refreshAccessToken()
            .catch(error => {
              console.error('Token refresh failed:', error);
              this.handleSecurityEvent({
                type: 'token_invalid',
                timestamp: Date.now(),
                details: error
              });
            });
        }, refreshTime);
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  /**
   * Securely stores authentication tokens
   */
  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    
    // Encrypt tokens before storage
    const encryptedAccess = this.encryptToken(tokens.accessToken);
    const encryptedRefresh = this.encryptToken(tokens.refreshToken);
    
    localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, encryptedAccess);
    localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, encryptedRefresh);
    
    this.apiService.setAuthToken(tokens.accessToken);
  }

  /**
   * Clears authentication state and stored tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    
    localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Encrypts token for secure storage
   */
  private encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, this.encryptionKey).toString();
  }

  /**
   * Decrypts token from secure storage
   */
  private decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}