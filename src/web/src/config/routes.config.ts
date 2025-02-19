import { RouteObject } from 'react-router-dom'; // ^6.11.0
import { lazy } from 'react'; // ^18.2.0
import { CircularProgress } from '@mui/material'; // ^5.0.0
import { useAuth } from '@auth/react'; // ^1.0.0

// Lazy-loaded page components with code splitting
const LandingPage = lazy(() => import('../pages/LandingPage'));
const ConversationPage = lazy(() => import('../pages/ConversationPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const ErrorPage = lazy(() => import('../pages/ErrorPage'));

/**
 * Enhanced route object with additional security and analytics metadata
 */
interface EnhancedRouteObject extends RouteObject {
  protected?: boolean;
  metadata: {
    title: string;
    analyticsId: string;
    loadPriority: number;
  };
}

/**
 * Creates a protected route configuration with enhanced security and monitoring
 * @param route - Route configuration object
 * @returns Protected route configuration
 */
const createProtectedRoute = (route: EnhancedRouteObject): EnhancedRouteObject => {
  const { auth } = useAuth();

  return {
    ...route,
    element: auth.isAuthenticated ? (
      route.element
    ) : (
      <CircularProgress size={40} aria-label="Loading authentication" />
    ),
    errorElement: <ErrorPage />,
    loader: async () => {
      if (!auth.isAuthenticated) {
        throw new Error('Authentication required');
      }
      return null;
    }
  };
};

/**
 * Application route configuration with security and analytics metadata
 */
const routes: EnhancedRouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <ErrorPage />,
    metadata: {
      title: 'Welcome',
      analyticsId: 'landing_page',
      loadPriority: 1
    }
  },
  {
    path: '/conversation',
    element: <ConversationPage />,
    protected: true,
    errorElement: <ErrorPage />,
    metadata: {
      title: 'Voice Conversation',
      analyticsId: 'conversation_page',
      loadPriority: 2
    }
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    protected: true,
    errorElement: <ErrorPage />,
    metadata: {
      title: 'Settings',
      analyticsId: 'settings_page',
      loadPriority: 3
    }
  },
  {
    path: '*',
    element: <ErrorPage />,
    metadata: {
      title: 'Error',
      analyticsId: 'error_page',
      loadPriority: 4
    }
  }
].map(route => route.protected ? createProtectedRoute(route) : route);

// Apply route transformations for protected routes
const processedRoutes = routes.map(route => {
  // Add performance monitoring
  const enhancedRoute = {
    ...route,
    loader: async (...args) => {
      const startTime = performance.now();
      try {
        const result = route.loader ? await route.loader(...args) : null;
        // Log route load performance
        const loadTime = performance.now() - startTime;
        console.debug(`Route ${route.path} loaded in ${loadTime}ms`);
        return result;
      } catch (error) {
        console.error(`Route ${route.path} load failed:`, error);
        throw error;
      }
    }
  };

  return enhancedRoute;
});

export default processedRoutes;