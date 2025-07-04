/**
 * Main Router Module for Node.js Tutorial Backend
 * 
 * This module serves as the central routing hub for the Node.js tutorial backend application,
 * aggregating and composing all sub-routers for API endpoints and providing comprehensive
 * error handling for undefined routes. It implements Express 5.1.0 best practices with
 * modular routing structure, automatic promise rejection handling, and centralized error
 * management.
 * 
 * Key Features:
 * - Modular router composition with clean separation of concerns
 * - Integration of all API endpoint sub-routers (currently '/hello')
 * - Comprehensive 404 error handling for undefined routes
 * - Express 5.1.0 enhanced error handling with automatic promise forwarding
 * - Centralized response formatting using structured error responses
 * - Production-ready error management with security best practices
 * - Educational clarity demonstrating Express routing patterns
 * 
 * Architecture:
 * - Main Express Router instance serves as the routing aggregator
 * - Sub-routers are mounted at their respective paths for modularity
 * - Catch-all error handler provides consistent 404 responses
 * - Integration with custom AppError types for structured error handling
 * - Seamless integration with Express 5's automatic promise rejection forwarding
 * 
 * Usage:
 * - Import and mount in main Express app: app.use('/', mainRouter)
 * - All API endpoints are accessible through this router
 * - Undefined routes automatically receive 404 Not Found responses
 * - Errors are properly forwarded to global error handling middleware
 * 
 * Security Features:
 * - Secure error handling without information disclosure
 * - Integration with Express 5's ReDoS protection via path-to-regexp 8.x
 * - Proper error sanitization and response formatting
 * - Structured error responses for monitoring and logging
 * 
 * @fileoverview Main router module aggregating all API endpoints with 404 handling
 * @author Node.js Tutorial Application
 * @version 1.0.0
 */

// External imports
import { Router } from 'express'; // Express Router v5.1.0 - Enhanced routing with security improvements and automatic promise handling

// Internal imports - Sub-routers
import helloRouter from './hello.js'; // Hello World endpoint router providing GET /hello functionality

// Internal imports - Utilities
import { formatError } from '../utils/responseFormatter.js'; // Centralized error response formatting utility
import { NotFoundError } from '../utils/errorTypes.js'; // Custom 404 Not Found error class for structured error handling

/**
 * Main Express Router Instance
 * 
 * Creates a new Express Router instance that serves as the central routing hub
 * for the entire application. This router aggregates all sub-routers and provides
 * comprehensive error handling for undefined routes. The router leverages Express 5.1.0's
 * enhanced features including automatic promise rejection handling and improved
 * security with path-to-regexp 8.x.
 * 
 * Router Features:
 * - Modular sub-router composition for clean architecture
 * - Automatic promise rejection forwarding to error middleware
 * - Enhanced security with ReDoS protection
 * - Consistent error handling across all routes
 * - Educational clarity for Express routing patterns
 * 
 * @constant {Router} router - Main Express Router instance for all API endpoints
 */
const router = Router();

/**
 * Sub-Router Mounting Configuration
 * 
 * Mount all sub-routers at their respective paths to create a modular routing
 * structure. Each sub-router handles a specific domain or functionality area,
 * enabling clean separation of concerns and easier maintenance.
 * 
 * Currently mounted routes:
 * - /hello: Hello World endpoint router (GET /hello)
 * 
 * Future sub-routers can be easily added here following the same pattern.
 * This modular approach facilitates testing, maintenance, and feature expansion
 * while maintaining consistency across the application.
 */

/**
 * Hello World Endpoint Router
 * 
 * Mounts the hello router at the '/hello' path, making the Hello World endpoint
 * accessible at GET /hello. This demonstrates the modular routing pattern where
 * each feature area has its own dedicated router that can be developed and tested
 * independently before being integrated into the main application.
 * 
 * Endpoint: GET /hello
 * Response: { "success": true, "message": "Hello world", "data": null, "status": 200 }
 * 
 * The hello router includes:
 * - Proper error handling with custom AppError types
 * - Centralized response formatting for consistency
 * - Integration with Express 5's automatic promise rejection handling
 * - Educational clarity demonstrating basic Express routing patterns
 */
router.use('/hello', helloRouter);

/**
 * 404 Not Found Handler
 * 
 * Express route handler function that handles all undefined routes with a standardized
 * 404 Not Found response. This catch-all handler ensures that any request to an
 * undefined route receives a consistent, secure error response instead of exposing
 * internal system information or causing application crashes.
 * 
 * The handler implements Express 5.1.0 best practices with:
 * - Structured error responses using custom AppError types
 * - Centralized error formatting for consistency
 * - Automatic promise rejection forwarding to error middleware
 * - Security-conscious error handling without information disclosure
 * - Educational clarity demonstrating proper 404 handling patterns
 * 
 * Handler Features:
 * - Creates structured NotFoundError for consistent error handling
 * - Includes request context information for debugging and monitoring
 * - Forwards errors to Express error handling middleware
 * - Provides user-friendly error messages without exposing system internals
 * - Integrates seamlessly with the global error handling pipeline
 * 
 * @async
 * @function notFoundHandler
 * @param {Request} req - Express Request object containing HTTP request information
 * @param {Response} res - Express Response object for sending HTTP responses
 * @param {NextFunction} next - Express NextFunction for error forwarding to middleware
 * 
 * @returns {Promise<void>} Forwards structured error to Express error handling middleware
 * 
 * @example
 * // Client makes request to undefined route
 * GET /nonexistent
 * 
 * // Handler creates structured error and forwards to error middleware
 * // Error middleware responds with:
 * // Status: 404 Not Found
 * // Body: { "success": false, "message": "Route not found", "code": "NOT_FOUND", "status": 404, "details": {...} }
 * 
 * @example
 * // Handler automatically triggered for any undefined route
 * GET /api/undefined-endpoint
 * POST /invalid-path
 * PUT /does-not-exist
 * 
 * // All result in consistent 404 Not Found responses
 */
async function notFoundHandler(req, res, next) {
    try {
        // Create a structured NotFoundError instance with detailed context information
        // This approach provides consistent error handling and useful debugging information
        // while maintaining security by not exposing internal system details
        const notFoundError = new NotFoundError(
            'Route not found', // User-friendly error message
            {
                // Request context information for debugging and monitoring
                requestedPath: req.path,              // The path that was requested
                requestedMethod: req.method,          // HTTP method used (GET, POST, etc.)
                requestedUrl: req.originalUrl,        // Full original URL including query parameters
                userAgent: req.get('User-Agent'),     // Client user agent for tracking
                timestamp: new Date().toISOString(),  // Request timestamp for logging
                requestId: req.id || 'unknown'        // Request ID if available for correlation
            }
        );
        
        // Forward the structured error to Express 5's error handling middleware
        // Express 5 automatically handles promise rejections, but we use next(err) 
        // for explicit error forwarding and educational clarity
        next(notFoundError);
        
    } catch (error) {
        // Handle any unexpected errors that occur during 404 processing
        // This ensures the application remains stable even if the error handler fails
        
        // Create a generic NotFoundError as fallback to ensure consistent error handling
        const fallbackError = new NotFoundError(
            'Route not found', // Simple fallback message
            {
                // Minimal context information for fallback scenario
                requestedPath: req.path || 'unknown',
                requestedMethod: req.method || 'unknown',
                errorContext: 'fallback_handler',
                originalError: error.message
            }
        );
        
        // Forward the fallback error to Express error handling middleware
        next(fallbackError);
    }
}

/**
 * Catch-All Route Handler Registration
 * 
 * Registers the 404 Not Found handler as a catch-all route that matches any
 * HTTP method and any path that hasn't been handled by previous route definitions.
 * This ensures that all undefined routes receive consistent error responses.
 * 
 * Route Configuration:
 * - Pattern: '*' (matches any path)
 * - Methods: ALL (GET, POST, PUT, DELETE, PATCH, etc.)
 * - Handler: notFoundHandler function
 * - Position: Last route to ensure it only catches unhandled requests
 * 
 * The router.all() method is used to handle all HTTP methods, ensuring that
 * whether a client sends a GET, POST, PUT, DELETE, or any other HTTP method
 * to an undefined route, they receive a consistent 404 Not Found response.
 * 
 * Security Considerations:
 * - Does not expose information about available routes or system structure
 * - Provides consistent error responses to prevent information disclosure
 * - Integrates with Express 5's security enhancements and ReDoS protection
 * - Uses structured error handling to maintain security best practices
 */
router.all('*', notFoundHandler);

/**
 * Module Exports
 * 
 * Exports the configured main Express Router instance for integration into the
 * main Express application. The router contains all sub-routers and error handling
 * necessary for complete API functionality.
 * 
 * The exported router includes:
 * - All mounted sub-routers with their respective endpoints
 * - Comprehensive 404 error handling for undefined routes
 * - Integration with Express 5.1.0 enhanced features
 * - Proper error forwarding to global error handling middleware
 * - Educational clarity demonstrating Express routing best practices
 * 
 * Router Contents:
 * - GET /hello: Hello World endpoint from hello router
 * - ALL *: 404 Not Found handler for undefined routes
 * - Automatic promise rejection forwarding to error middleware
 * - Structured error responses using custom AppError types
 * - Centralized response formatting for consistency
 * 
 * Usage Examples:
 * - import router from './routes/index.js'
 * - app.use('/', router) // Mount all routes at root path
 * - app.use('/api', router) // Mount all routes under /api prefix
 * - app.use('/v1', router) // Mount all routes under /v1 prefix
 * 
 * Integration Benefits:
 * - Single import provides access to all API endpoints
 * - Modular structure allows easy addition of new sub-routers
 * - Consistent error handling across all routes
 * - Express 5.1.0 feature integration with automatic promise handling
 * - Educational clarity for learning Express routing patterns
 * 
 * @exports {Router} router - Main Express Router with all endpoints and error handling
 */
export default router;

/**
 * Additional Implementation Notes for Educational Purposes:
 * 
 * 1. Express 5.1.0 Integration Features:
 *    - Automatic promise rejection forwarding eliminates need for manual try/catch in most cases
 *    - Enhanced security with path-to-regexp 8.x providing ReDoS attack protection
 *    - Improved error handling pipeline with better promise integration
 *    - Backward compatibility with Express 4.x patterns while adding new capabilities
 * 
 * 2. Modular Router Architecture Benefits:
 *    - Clean separation of concerns with dedicated sub-routers for each feature area
 *    - Easy testing and maintenance with isolated router modules
 *    - Simplified debugging with clear routing hierarchy
 *    - Scalable architecture that supports easy addition of new endpoints
 * 
 * 3. Error Handling Best Practices:
 *    - Structured error responses using custom AppError types provide consistency
 *    - Centralized error formatting ensures uniform API responses
 *    - Proper error context information aids debugging without exposing sensitive data
 *    - Integration with Express error middleware enables comprehensive error management
 * 
 * 4. Security Considerations:
 *    - 404 responses don't expose information about available routes or system structure
 *    - Error messages are user-friendly but don't reveal internal system details
 *    - Request context is logged for monitoring without exposing sensitive information
 *    - Integration with Express 5's security enhancements provides additional protection
 * 
 * 5. Performance Optimization:
 *    - Efficient router composition minimizes request processing overhead
 *    - Catch-all handler positioned last ensures it only processes unmatched requests
 *    - Structured error handling reduces error processing time
 *    - Express 5's performance improvements provide better throughput
 * 
 * 6. Monitoring and Observability:
 *    - Structured error responses enable effective logging and monitoring
 *    - Request context information supports debugging and performance analysis
 *    - Error codes facilitate automated error tracking and alerting
 *    - Consistent response format enables API monitoring and analytics
 * 
 * 7. Educational Value:
 *    - Demonstrates Express routing fundamentals and best practices
 *    - Shows proper error handling patterns for production applications
 *    - Illustrates modular architecture benefits for maintainable code
 *    - Provides clear examples of Express 5.1.0 feature utilization
 * 
 * 8. Testing Strategy:
 *    - Each sub-router can be tested independently before integration
 *    - 404 handler can be tested with various undefined route scenarios
 *    - Error forwarding can be validated with integration tests
 *    - Response format consistency can be verified across all endpoints
 * 
 * 9. Future Enhancement Possibilities:
 *    - Add middleware for request logging and performance monitoring
 *    - Implement rate limiting for API protection
 *    - Add authentication/authorization middleware for secure endpoints
 *    - Support for API versioning with versioned sub-routers
 *    - Integration with OpenAPI/Swagger for API documentation
 * 
 * 10. Production Deployment Considerations:
 *     - Configure appropriate logging levels for production vs development
 *     - Implement proper error monitoring and alerting systems
 *     - Consider request correlation IDs for distributed tracing
 *     - Ensure error responses don't expose sensitive system information
 *     - Implement comprehensive health checks and monitoring endpoints
 */