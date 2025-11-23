// Import centralized logging utility for observability and debugging
const { logger } = require('../utils/logger.js');

// Import custom error class for standardized error handling
const { AppError } = require('../utils/errors.js');

/**
 * Express route handler for GET /hello endpoint
 * Returns a plain text 'Hello world' response with HTTP 200 status
 * Implements comprehensive logging and error handling for production readiness
 * 
 * @param {object} req - Express Request object containing HTTP request details
 * @param {object} res - Express Response object for sending HTTP response
 * @param {function} next - Express NextFunction for error propagation to middleware
 * @returns {void} Sends a plain text response to the client or propagates errors
 */
async function helloController(req, res, next) {
    try {
        // Log the start of the /hello request handling with request context
        logger.info('Processing GET /hello request', {
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            ip: req.ip || (req.connection && req.connection.remoteAddress),
            timestamp: new Date().toISOString()
        });

        // Set response headers for plain text content type
        res.set('Content-Type', 'text/plain');
        
        // Send 200 OK response with 'Hello world' message
        res.status(200).send('Hello world');
        
        // Log successful response for observability
        logger.info('Successfully sent /hello response', {
            status: 200,
            contentType: 'text/plain',
            responseTime: Date.now()
        });
        
    } catch (error) {
        // Log the error with comprehensive context for debugging
        logger.error('Error occurred in /hello endpoint', {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            request: {
                method: req.method,
                path: req.path,
                userAgent: req.get('User-Agent'),
                ip: req.ip || (req.connection && req.connection.remoteAddress),
                timestamp: new Date().toISOString()
            }
        });
        
        // Normalize error to AppError if not already one
        let normalizedError;
        if (error instanceof AppError) {
            normalizedError = error;
        } else {
            // Wrap unexpected errors in AppError for consistent handling
            normalizedError = new AppError(
                'An unexpected error occurred while processing the /hello request',
                500,
                { originalError: error.message }
            );
        }
        
        // Propagate error to Express error middleware using next()
        next(normalizedError);
    }
}

// Export the helloController function for use in Express routing
module.exports = {
    helloController
};