/**
 * Root entry point for the AI Voice Agent web application
 * Initializes React, Redux store, and sets up necessary providers
 * @version 1.0.0
 */

import React, { StrictMode } from 'react'; // ^18.2.0
import { createRoot } from 'react-dom/client'; // ^18.2.0
import { Provider } from 'react-redux'; // ^8.1.0
import App from './App';
import store from './store';
import { ThemeProvider } from './theme/themeProvider';

/**
 * Checks browser compatibility with required features
 * @returns {boolean} True if browser is compatible
 */
const checkBrowserCompatibility = (): boolean => {
  const requiredFeatures = {
    webRTC: !!window.MediaRecorder,
    webAudio: !!window.AudioContext || !!(window as any).webkitAudioContext,
    webSocket: !!window.WebSocket,
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  };

  const missingFeatures = Object.entries(requiredFeatures)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);

  if (missingFeatures.length > 0) {
    console.error('Browser compatibility check failed:', missingFeatures);
    return false;
  }

  const browserInfo = {
    userAgent: navigator.userAgent,
    vendor: navigator.vendor,
    language: navigator.language
  };
  console.debug('Browser compatibility check passed:', browserInfo);
  return true;
};

/**
 * Initializes performance monitoring
 */
const initializePerformance = (): void => {
  if (process.env.NODE_ENV === 'development') {
    const perfObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.debug('Performance Entry:', {
          name: entry.name,
          type: entry.entryType,
          duration: entry.duration,
          startTime: entry.startTime
        });
      });
    });

    perfObserver.observe({
      entryTypes: ['navigation', 'resource', 'mark', 'measure']
    });

    // Mark initial load
    performance.mark('app-init-start');
  }
};

/**
 * Renders the root application with error boundary
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found. Ensure there is a <div id="root"> in your HTML.');
  }

  // Initialize performance monitoring in development
  if (process.env.NODE_ENV === 'development') {
    initializePerformance();
  }

  // Check browser compatibility
  if (!checkBrowserCompatibility()) {
    const incompatibleMessage = document.createElement('div');
    incompatibleMessage.innerHTML = `
      <div role="alert" style="text-align: center; padding: 20px;">
        <h1>Browser Not Supported</h1>
        <p>Please use a modern browser that supports WebRTC and Web Audio features:</p>
        <ul style="list-style: none;">
          <li>Chrome 83+</li>
          <li>Firefox 78+</li>
          <li>Safari 14+</li>
          <li>Edge 88+</li>
        </ul>
      </div>
    `;
    rootElement.appendChild(incompatibleMessage);
    return;
  }

  try {
    const root = createRoot(rootElement);
    
    root.render(
      <StrictMode>
        <Provider store={store}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </Provider>
      </StrictMode>
    );

    // Mark render complete in development
    if (process.env.NODE_ENV === 'development') {
      performance.mark('app-init-complete');
      performance.measure('app-initialization', 'app-init-start', 'app-init-complete');
    }
  } catch (error) {
    console.error('Failed to render application:', error);
    const errorMessage = document.createElement('div');
    errorMessage.setAttribute('role', 'alert');
    errorMessage.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h1>Application Error</h1>
        <p>Failed to initialize the application. Please refresh the page or contact support.</p>
      </div>
    `;
    rootElement.appendChild(errorMessage);
  }
};

// Initialize the application
renderApp();

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    console.log('Hot module replacement activated');
    renderApp();
  });
}