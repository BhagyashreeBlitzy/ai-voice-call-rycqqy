// Import Express Router constructor for creating modular route handlers
const { Router } = require('express'); // express@^5.1.0

// Import the hello controller function for handling /hello endpoint requests
const { helloController } = require('../controllers/helloController.js');

/**
 * Factory function that creates and configures the Express router for the /hello endpoint
 * Returns a fully configured router instance with the GET /hello route registered
 * Designed for modular integration into the main API router with proper error propagation
 * 
 * @returns {Router} An Express Router instance with the GET /hello route registered
 */
function createHelloRouter() {
    // Create a new Express Router instance for the /hello endpoint
    // This router will be mounted in the main API router for modular route organization
    const router = Router();

    // Register the GET /hello route with the helloController as the handler
    // The helloController is an async function that handles the request/response cycle
    // All errors are automatically propagated to Express error middleware via next()
    // Compatible with Express 5 async/await patterns and automatic error handling
    router.get('/hello', helloController);

    // Return the configured router instance for mounting in the main API router
    return router;
}

// Create the configured router instance using the factory function
// This ensures the router is properly initialized with the /hello route
const router = createHelloRouter();

// Export the configured router instance for use in the main API router
// The router is stateless and safe for concurrent/asynchronous use
// All errors from helloController are propagated to centralized error middleware
// Designed for educational clarity and production-readiness
module.exports = {
    router
};