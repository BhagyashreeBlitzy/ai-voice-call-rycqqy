// Import Express Router constructor for creating modular route handlers
const { Router } = require('express'); // express@^5.1.0

// Import the hello router for handling /hello endpoint requests
const { router: helloRouter } = require('./hello.js');

/**
 * Factory function that creates and configures the main API router
 * Aggregates and mounts all sub-routers (currently the /hello endpoint) and provides
 * a single entry point for route registration in the main Express app
 * Designed for extensibility as new endpoints are added following best practices
 * for modular Express.js applications with proper error propagation
 * 
 * @returns {Router} An Express Router instance with all endpoint routers mounted
 */
function createApiRouter() {
    // Create a new Express Router instance for the main API
    // This router serves as the primary entry point for all API endpoints
    // and enables modular route composition and maintainable architecture
    const router = Router();
    
    // Mount the helloRouter on the main API router
    // The helloRouter handles GET /hello requests and returns "Hello world"
    // All sub-router errors are automatically propagated to centralized error middleware
    // via Express 5's enhanced async/await error handling capabilities
    router.use(helloRouter);
    
    // Future endpoint routers should be mounted here following the same pattern:
    // router.use(userRouter);        // For /users endpoints
    // router.use(statusRouter);      // For /status endpoints
    // router.use(authRouter);        // For /auth endpoints
    // This modular approach ensures maintainable and scalable API structure
    
    // Return the configured main API router instance
    // The router is stateless and safe for concurrent/asynchronous use
    // All errors from sub-routers are propagated to the centralized error middleware
    return router;
}

// Create the main API router instance using the factory function
// This ensures the router is properly initialized with all sub-routers mounted
// The factory pattern enables testing and potential runtime configuration
const router = createApiRouter();

// Export the configured main API router for use in the Express application
// This router should be mounted in the main app at the desired base path
// Example usage in app.js: app.use('/', apiRouter)
// All endpoint routers are accessible through this single entry point
// Error handling is delegated to centralized Express error middleware
module.exports = {
    router,
    // Export the factory function for testing and advanced configuration scenarios
    createApiRouter
};