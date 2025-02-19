/**
 * Redux Toolkit slice for managing user state in the frontend application
 * Handles authentication, preferences, and secure token management
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '../../services/auth.service';
import type { AppSettings } from '../../types/settings.types';
import type { RootState } from '../store';

// Initialize AuthService with security configuration
const authService = new AuthService({
  tokenRefreshThreshold: 60000, // 1 minute before expiry
  maxRefreshAttempts: 3,
  encryptionKey: process.env.REACT_APP_ENCRYPTION_KEY || 'default-key'
});

// Interface definitions
interface UserState {
  user: {
    id: string;
    email: string;
    preferences: AppSettings;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Async thunks
export const loginUser = createAsyncThunk(
  'user/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { user, tokens } = await authService.login({
        email: credentials.email,
        password: credentials.password,
        deviceId: crypto.randomUUID()
      });
      return user;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateUserPreferences = createAsyncThunk(
  'user/updatePreferences',
  async (preferences: Partial<AppSettings>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const currentPreferences = state.user.user?.preferences;
      
      if (!currentPreferences) {
        throw new Error('No user preferences found');
      }

      const updatedPreferences: AppSettings = {
        ...currentPreferences,
        ...preferences
      };

      await authService.updatePreferences(updatedPreferences);
      return updatedPreferences;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update preferences cases
      .addCase(updateUserPreferences.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user.preferences = action.payload;
        }
      })
      .addCase(updateUserPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

// Selectors
export const selectUser = (state: RootState) => state.user.user;
export const selectIsAuthenticated = (state: RootState) => state.user.isAuthenticated;
export const selectUserPreferences = (state: RootState) => state.user.user?.preferences;
export const selectUserError = (state: RootState) => state.user.error;
export const selectIsLoading = (state: RootState) => state.user.isLoading;

// Actions
export const { setLoading, setError, clearError } = userSlice.actions;

// Reducer
export default userSlice.reducer;