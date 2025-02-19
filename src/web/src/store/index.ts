/**
 * Root Redux store configuration with enhanced performance optimizations,
 * type safety, and real-time state management for voice-based AI application
 * @packageDocumentation
 * @version 1.0.0
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit'; // ^2.0.0
import audioReducer from './slices/audioSlice';
import conversationReducer from './slices/conversationSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';

/**
 * Combines all feature reducers with error boundaries and type safety
 */
const createRootReducer = () => {
  return combineReducers({
    audio: audioReducer,
    conversation: conversationReducer,
    settings: settingsReducer,
    ui: uiReducer,
    user: userReducer
  });
};

/**
 * Custom error boundary middleware for handling reducer errors
 */
const errorBoundaryMiddleware = () => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux Error:', error);
    // Report to error monitoring service
    throw error;
  }
};

/**
 * Performance monitoring middleware for tracking state updates
 */
const performanceMiddleware = () => (next: any) => (action: any) => {
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;

  if (duration > 16) { // Monitor actions taking longer than one frame (16ms)
    console.warn(`Slow action: ${action.type} took ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Configure and create the Redux store with optimized settings
 */
export const store = configureStore({
  reducer: createRootReducer(),
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    // Optimize serialization checks for better performance
    serializableCheck: {
      // Ignore non-serializable values in specific paths
      ignoredActions: ['audio/updateAudioLevel'],
      ignoredPaths: ['audio.processingMetadata']
    },
    // Enable immutability checks only in development
    immutableCheck: process.env.NODE_ENV === 'development',
    // Add custom middleware
  }).concat([errorBoundaryMiddleware, performanceMiddleware]),
  devTools: {
    // Configure Redux DevTools with performance tracking
    trace: process.env.NODE_ENV !== 'production',
    traceLimit: 25,
    actionsBlacklist: ['audio/updateAudioLevel'] // Skip high-frequency actions
  }
});

// Enable hot module replacement for reducers in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./slices', () => {
    store.replaceReducer(createRootReducer());
  });
}

// Export type definitions for global store types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store instance as default
export default store;

// Export selectors for type-safe state access
export const selectAudioState = (state: RootState) => state.audio;
export const selectConversationState = (state: RootState) => state.conversation;
export const selectSettingsState = (state: RootState) => state.settings;
export const selectUIState = (state: RootState) => state.ui;
export const selectUserState = (state: RootState) => state.user;