/**
 * Redux slice for managing global UI state including theme settings, loading states,
 * modals, toasts, and other UI-related state across the application.
 * @packageDocumentation
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^2.0.0
import { ThemeSettings } from '../../types/settings.types';
import { THEME_COLORS } from '../../constants/theme.constants';

/**
 * Interface for toast notification state configuration
 */
export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  autoClose: boolean;
}

/**
 * Interface defining the shape of UI state
 */
export interface UIState {
  /** Theme settings for the application */
  theme: ThemeSettings;
  /** Global loading state indicator */
  isLoading: boolean;
  /** Currently active modal with optional props */
  activeModal: {
    type: string;
    props?: Record<string, unknown>;
  } | null;
  /** Current toast notification state */
  toast: ToastState | null;
  /** Sidebar visibility state */
  sidebarOpen: boolean;
}

/**
 * Initial state for the UI slice
 */
const initialState: UIState = {
  theme: {
    mode: 'system',
    useSystemPreference: true
  },
  isLoading: false,
  activeModal: null,
  toast: null,
  sidebarOpen: false
};

/**
 * Redux slice for UI state management
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Updates theme settings
     */
    setTheme: (state, action: PayloadAction<ThemeSettings>) => {
      state.theme = action.payload;
    },

    /**
     * Sets global loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Shows a modal with optional props
     */
    showModal: (state, action: PayloadAction<{ type: string; props?: Record<string, unknown> }>) => {
      state.activeModal = action.payload;
    },

    /**
     * Hides the currently active modal
     */
    hideModal: (state) => {
      state.activeModal = null;
    },

    /**
     * Shows a toast notification
     */
    showToast: (state, action: PayloadAction<ToastState>) => {
      const { type } = action.payload;
      const toastColors = {
        success: THEME_COLORS.primary,
        error: THEME_COLORS.error,
        info: THEME_COLORS.info,
        warning: THEME_COLORS.warning
      };

      state.toast = {
        ...action.payload,
        duration: action.payload.duration || 5000,
        autoClose: action.payload.autoClose ?? true,
        type: toastColors[type] ? type : 'info'
      };
    },

    /**
     * Hides the current toast notification
     */
    hideToast: (state) => {
      state.toast = null;
    },

    /**
     * Toggles sidebar visibility
     * @param state - Current UI state
     * @param action - Optional boolean to force specific state
     */
    toggleSidebar: (state, action: PayloadAction<boolean | undefined>) => {
      state.sidebarOpen = action.payload ?? !state.sidebarOpen;
    }
  }
});

// Export actions for use in components
export const uiActions = uiSlice.actions;

// Export reducer as default for store configuration
export default uiSlice.reducer;