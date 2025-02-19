import React, { useEffect, memo } from 'react'; // ^18.2.0
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // ^6.4.0
import { Provider } from 'react-redux'; // ^8.1.0
import { ErrorBoundary } from '@sentry/react'; // ^7.0.0
import { ThemeProvider } from './theme/themeProvider';

// Performance monitoring
const routePerformanceObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    // Report route change performance metrics
    console.debug('Route Change Performance:', {
      route: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    });
  });
});

// Enhanced error boundary with retry capability
const RouteErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={({ error, resetError }) => (
      <div role="alert" aria-live="assertive">
        <h2>An error occurred</h2>
        <p>{error.message}</p>
        <button onClick={resetError}>Retry</button>
      </div>
    )}
    beforeCapture={(scope) => {
      scope.setTag('location', window.location.href);
      scope.setTag('userAgent', navigator.userAgent);
    }}
  >
    {children}
  </ErrorBoundary>
);

// Protected route with security checks and performance tracking
const PrivateRoute = memo(({ children, ...routeProps }: { 
  children: React.ReactNode;
  [key: string]: any;
}) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const startTime = performance.now();
        
        // Check session validity
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Validate token and session
        const response = await fetch('/api/v1/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Request-ID': crypto.randomUUID()
          }
        });

        if (!response.ok) {
          throw new Error('Session validation failed');
        }

        // Report validation performance
        const duration = performance.now() - startTime;
        console.debug('Session validation duration:', duration);

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();

    // Cleanup on unmount
    return () => {
      setIsLoading(false);
      setIsAuthenticated(false);
    };
  }, []);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite">
        <p>Verifying your session...</p>
      </div>
    );
  }

  return isAuthenticated ? (
    <RouteErrorBoundary>{children}</RouteErrorBoundary>
  ) : (
    <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  );
});

PrivateRoute.displayName = 'PrivateRoute';

// Root application component
const App: React.FC = () => {
  // Initialize performance monitoring
  useEffect(() => {
    routePerformanceObserver.observe({
      entryTypes: ['navigation', 'resource']
    });

    // Security headers check
    const securityCheck = () => {
      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        console.warn('CSP header not detected');
      }
    };

    securityCheck();

    // Browser compatibility check
    const checkBrowserCompatibility = () => {
      const unsupportedBrowser = !window.WebSocket || !window.MediaRecorder;
      if (unsupportedBrowser) {
        console.error('Browser does not support required features');
      }
    };

    checkBrowserCompatibility();

    return () => {
      routePerformanceObserver.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                }
              />
              <Route
                path="/conversation"
                element={
                  <PrivateRoute>
                    <Conversation />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />

              {/* Fallback route */}
              <Route
                path="*"
                element={
                  <div role="alert">
                    <h2>Page Not Found</h2>
                    <p>The requested page does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;