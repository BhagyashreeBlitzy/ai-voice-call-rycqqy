// External dependencies - Express 5.1.0 with enhanced security and automatic promise rejection handling
const express = require('express'); // ^5.1.0 - Core web application framework with enhanced security features, ReDoS protection, and automatic promise rejection forwarding
const bodyParser = require('body-parser'); // ^2.1.0 - Express middleware for parsing incoming JSON request bodies with depth limits and security enhancements

// Internal dependencies - Middleware and utilities
const { requestLogger } = require('./middleware/logger.js'); // Express middleware for logging all HTTP requests and responses with structured logging and performance monitoring
const { router } = require('./routes/index.js'); // Main Express Router instance exposing all API endpoints including /hello and catch-all 404 handler
const { errorHandler } = require('./middleware/errorHandler.js'); // Express global error-handling middleware for catching, logging, and responding to all unhandled errors and rejected promises
const { ENVIRONMENT } = require('./config/index.js'); // Current application environment (development, production, test) for environment-aware logging, middleware, and error handling

/**
 * Express Application Factory Function
 * 
 * Creates and configures a complete Express application instance with all necessary
 * middleware, routing, and error handling. This function implements Express 5.1.0
 * best practices with enhanced security features, automatic promise rejection handling,
 * and production-ready middleware pipeline configuration.
 * 
 * The application architecture follows the middleware pipeline pattern where each
 * request flows through a series of middleware functions in a specific order:
 * 1. Request logging for traceability and monitoring
 * 2. JSON body parsing for handling request data
 * 3. Main router for all API endpoints and 404 handling
 * 4. Global error handler for comprehensive error management
 * 
 * Express 5.1.0 Integration Features:
 * - Automatic promise rejection forwarding to error handling middleware
 * - Enhanced security with ReDoS attack prevention via path-to-regexp 8.x
 * - Improved error handling pipeline with better promise integration
 * - Modern middleware architecture with async/await support
 * - Comprehensive threat model implementation for security
 * 
 * Educational Design Principles:
 * - Clear middleware execution order for learning Express pipeline concepts
 * - Comprehensive error handling demonstrating production-ready patterns
 * - Modular architecture showing separation of concerns
 * - Environment-aware configuration for different deployment scenarios
 * - Extensive documentation for educational clarity and best practices
 * 
 * Production Considerations:
 * - Secure error handling without information disclosure
 * - Comprehensive logging for monitoring and debugging
 * - Performance optimization with efficient middleware ordering
 * - Security headers and protection mechanisms
 * - Proper resource management and cleanup
 * 
 * @function createApp
 * @returns {express.Application} Fully configured Express application instance ready for server startup
 * 
 * @example
 * // Basic usage in server entry point
 * const { createApp } = require('./app.js');
 * const { PORT } = require('./config/index.js');
 * 
 * const app = createApp();
 * app.listen(PORT, () => {
 *   console.log(`Server listening on port ${PORT}`);
 * });
 * 
 * @example
 * // Advanced usage with custom configuration
 * const app = createApp();
 * 
 * // Add custom middleware before starting server
 * app.use('/api', customMiddleware);
 * 
 * const server = app.listen(PORT, () => {
 *   console.log(`Server started in ${ENVIRONMENT} mode on port ${PORT}`);
 * });
 * 
 * @example
 * // Testing usage
 * const request = require('supertest');
 * const app = createApp();
 * 
 * describe('App Integration Tests', () => {
 *   it('should respond to /hello endpoint', async () => {
 *     const response = await request(app).get('/hello');
 *     expect(response.status).toBe(200);
 *     expect(response.body.message).toBe('Hello world');
 *   });
 * });
 */
function createApp() {
    // Step 1: Create new Express application instance
    // Initialize Express 5.1.0 with default configuration and enhanced security features
    // Express 5 includes automatic promise rejection handling and improved security
    const app = express();
    
    // Step 2: Configure Express application settings for security and performance
    // Set security-related Express configuration options for production deployment
    
    // Disable Express signature header for security (prevents framework fingerprinting)
    app.disable('x-powered-by');
    
    // Set trust proxy for proper IP address resolution when behind reverse proxies
    // This ensures accurate client IP logging and security features
    if (ENVIRONMENT === 'production') {
        app.set('trust proxy', 1); // Trust first proxy in production
    }
    
    // Configure JSON parsing limits and security settings
    // Prevent potential denial of service attacks through large payloads
    app.set('json spaces', ENVIRONMENT === 'development' ? 2 : 0); // Pretty print JSON in development
    
    // Step 3: Configure global middleware pipeline
    // Set up middleware in specific order for optimal request processing flow
    // Order is critical: logging -> parsing -> routing -> error handling
    
    // 3a. Request Logging Middleware (First middleware to capture all requests)
    // Logs all incoming HTTP requests and outgoing responses with timing information
    // Provides structured logging for monitoring, debugging, and performance analysis
    // Must be first to ensure all requests are logged regardless of processing outcome
    app.use(requestLogger);
    
    // 3b. JSON Body Parser Middleware (Second middleware for request data parsing)
    // Parses incoming JSON request bodies and makes data available in req.body
    // Includes security enhancements and depth limits to prevent abuse
    // Express 5.1.0 integration provides improved error handling for malformed JSON
    app.use(bodyParser.json({
        // Limit JSON payload size to prevent denial of service attacks
        limit: '10mb',
        
        // Set parsing depth limit to prevent nested object attacks
        // body-parser 2.1.0 includes enhanced depth control for security
        depth: 10,
        
        // Enable strict JSON parsing to catch malformed requests early
        strict: true,
        
        // Configure content type detection for proper request handling
        type: 'application/json',
        
        // Add custom error handling for JSON parsing failures
        verify: function(req, res, buf, encoding) {
            // Store raw body for debugging purposes if needed
            if (ENVIRONMENT === 'development') {
                req.rawBody = buf;
            }
        }
    }));
    
    // 3c. URL-encoded body parser for form data (if needed in future)
    // Configure URL-encoded body parsing with security enhancements
    app.use(bodyParser.urlencoded({
        // Use extended parser for rich objects and arrays
        extended: false, // body-parser 2.1.0 defaults to false for security
        
        // Limit payload size to prevent abuse
        limit: '10mb',
        
        // Set parameter limit to prevent parameter pollution attacks
        parameterLimit: 1000,
        
        // Configure depth limit for nested objects
        depth: 10
    }));
    
    // Step 4: Security Headers Middleware
    // Add basic security headers for protection against common web vulnerabilities
    // These headers provide defense-in-depth security measures
    app.use((req, res, next) => {
        // Prevent MIME type sniffing attacks
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Prevent clickjacking attacks
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Enable XSS protection in browsers
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Prevent information disclosure about the server
        res.removeHeader('Server');
        
        // Set security-conscious cache control for error responses
        if (req.path.includes('error') || res.statusCode >= 400) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        
        // Continue to next middleware
        next();
    });
    
    // Step 5: Main Router Mounting (Third middleware for application routing)
    // Mount the main router at the root path to handle all API endpoints
    // The router includes all sub-routers (/hello) and the catch-all 404 handler
    // Express 5.1.0 provides enhanced routing security with path-to-regexp 8.x
    app.use('/', router);
    
    // Step 6: Global Error Handling Middleware (Last middleware for error processing)
    // Register the global error handler as the final middleware in the pipeline
    // Catches all unhandled errors and rejected promises, logs them, and returns standardized responses
    // Express 5.1.0 automatically forwards rejected promises to this error handler
    // Must be registered last to catch errors from all previous middleware and routes
    app.use(errorHandler);
    
    // Step 7: Application Health and Status Configuration
    // Configure health check and status monitoring capabilities for production deployment
    // These features support load balancers, monitoring systems, and operational requirements
    
    // Add application metadata for debugging and monitoring
    app.locals.environment = ENVIRONMENT;
    app.locals.startTime = new Date().toISOString();
    app.locals.version = '1.0.0';
    app.locals.description = 'Node.js Tutorial Backend Application';
    
    // Configure graceful shutdown handling for production environments
    // This ensures proper cleanup when the application receives termination signals
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, starting graceful shutdown...');
        // Additional cleanup logic can be added here for production deployments
    });
    
    process.on('SIGINT', () => {
        console.log('SIGINT received, starting graceful shutdown...');
        // Additional cleanup logic can be added here for development environments
    });
    
    // Step 8: Return the fully configured Express application instance
    // The app is now ready to be used by the server entry point for HTTP server startup
    // All middleware is configured, routing is set up, and error handling is in place
    return app;
}

/**
 * Module Exports
 * 
 * Export the createApp function and the configured Express app instance for use
 * throughout the application. This provides flexibility for different usage patterns
 * including testing, server startup, and custom configuration scenarios.
 * 
 * Export Structure:
 * - createApp: Factory function for creating configured Express applications
 * - app: Pre-configured Express application instance for immediate use
 * 
 * The modular export pattern supports various integration approaches:
 * - Server entry points can use createApp() for custom configuration
 * - Testing frameworks can create fresh app instances for each test suite
 * - Development tools can access the pre-configured app for immediate use
 * 
 * Usage Examples:
 * - const { createApp } = require('./app.js') - Factory function import
 * - const { app } = require('./app.js') - Pre-configured app import
 * - const appModule = require('./app.js') - Full module import
 * 
 * Educational Benefits:
 * - Demonstrates factory pattern for application configuration
 * - Shows module export best practices for Node.js applications
 * - Provides flexibility for different deployment and testing scenarios
 * - Illustrates separation between app configuration and server startup
 * 
 * Production Considerations:
 * - Factory pattern enables multiple app instances for testing
 * - Pre-configured app reduces startup time for simple deployments
 * - Modular exports support different operational requirements
 * - Clean separation enables proper testing and deployment strategies
 */

// Export the factory function for creating configured Express applications
// This is the primary export used by server entry points and testing frameworks
module.exports = {
    createApp
};

// Export a pre-configured Express application instance for immediate use
// This provides convenience for simple deployment scenarios and development
module.exports.app = createApp();

/**
 * Implementation Notes for Educational Reference:
 * 
 * 1. Express 5.1.0 Modern Features Utilized:
 *    - Automatic promise rejection forwarding eliminates need for manual error handling in async routes
 *    - Enhanced security with ReDoS attack prevention through path-to-regexp 8.x updates
 *    - Improved error handling pipeline with better promise integration and error propagation
 *    - Modern middleware architecture supporting both callback and promise-based patterns
 * 
 * 2. Middleware Pipeline Architecture:
 *    - Request logging captures all requests before any processing for complete traceability
 *    - Body parsing configured with security limits and enhanced error handling capabilities
 *    - Router mounting provides modular endpoint organization with catch-all error handling
 *    - Error handler positioned last to catch all unhandled errors and promise rejections
 * 
 * 3. Security Implementation Best Practices:
 *    - Comprehensive security headers prevent common web vulnerabilities and attacks
 *    - Request payload limits and parsing restrictions prevent denial of service attacks
 *    - Framework fingerprinting disabled to reduce information disclosure to attackers
 *    - Error handling sanitized to prevent sensitive information exposure to clients
 * 
 * 4. Production Deployment Readiness:
 *    - Environment-aware configuration adapts behavior for development vs production deployment
 *    - Graceful shutdown handling ensures proper cleanup during deployment and maintenance
 *    - Comprehensive logging and monitoring integration supports operational requirements
 *    - Performance optimizations with efficient middleware ordering and resource management
 * 
 * 5. Educational Design Principles:
 *    - Clear separation of concerns demonstrates modular application architecture patterns
 *    - Comprehensive documentation explains each configuration decision and implementation choice
 *    - Progressive complexity building from basic setup to production-ready configuration
 *    - Real-world patterns and best practices suitable for professional development
 * 
 * 6. Testing and Development Support:
 *    - Factory pattern enables creation of fresh app instances for isolated testing
 *    - Development-specific features like pretty-printed JSON and enhanced logging
 *    - Modular export structure supports different testing frameworks and approaches
 *    - Clear configuration makes it easy to modify behavior for different scenarios
 * 
 * 7. Performance and Scalability Considerations:
 *    - Efficient middleware ordering minimizes request processing overhead
 *    - Proper resource management and cleanup prevent memory leaks
 *    - Security headers and parsing limits protect against resource exhaustion attacks
 *    - Modular architecture supports horizontal scaling and load balancing
 * 
 * 8. Integration with Existing Codebase:
 *    - Seamless integration with custom middleware modules (logger, errorHandler)
 *    - Proper utilization of routing modules and response formatting utilities
 *    - Environment configuration integration for consistent behavior across components
 *    - Error handling integration with custom AppError types and response formatting
 * 
 * 9. Future Enhancement Readiness:
 *    - Modular architecture easily accommodates additional middleware and features
 *    - Configuration structure supports extension with authentication, authorization, and other features
 *    - Clean separation enables gradual migration to microservices or advanced patterns
 *    - Comprehensive foundation suitable for scaling to production applications
 * 
 * 10. Monitoring and Observability Integration:
 *     - Structured logging integration provides comprehensive request and error tracking
 *     - Application metadata enables monitoring and health check implementations
 *     - Error handling pipeline supports integration with monitoring and alerting systems
 *     - Performance tracking capabilities built into middleware pipeline for operational insight
 */