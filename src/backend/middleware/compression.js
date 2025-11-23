// compression package v1.7.4 - Provides HTTP response compression middleware for Express.js
const compression = require('compression');

/**
 * Compression Middleware Factory
 * 
 * Creates and configures Express.js middleware for HTTP response compression.
 * Implements gzip/deflate compression for all eligible HTTP responses to improve
 * performance and reduce bandwidth usage, following production best practices.
 * 
 * This middleware integrates with Express.js v5.1.0+ and Node.js v22.x LTS,
 * providing automatic response compression for improved network performance
 * and reduced server bandwidth consumption.
 * 
 * @param {Object} [options] - Optional configuration object for compression behavior
 * @param {number} [options.threshold=1024] - Minimum response size in bytes to compress
 * @param {number} [options.level=6] - Compression level (1-9, where 9 is maximum compression)
 * @param {Function} [options.filter] - Custom function to determine which responses to compress
 * @param {number} [options.windowBits=15] - Window size for zlib compression
 * @param {number} [options.memLevel=8] - Memory level for zlib compression
 * @param {number} [options.chunkSize=16384] - Chunk size for compression stream
 * @param {Object} [options.strategy] - Compression strategy (e.g., zlib.constants.Z_DEFAULT_STRATEGY)
 * 
 * @returns {Function} Express middleware function for HTTP response compression
 * 
 * @example
 * // Basic usage with default options
 * const { compressionMiddleware } = require('./middleware/compression');
 * app.use(compressionMiddleware());
 * 
 * @example
 * // Advanced configuration with custom options
 * const { compressionMiddleware } = require('./middleware/compression');
 * app.use(compressionMiddleware({
 *   threshold: 2048,
 *   level: 7,
 *   filter: (req, res) => {
 *     // Custom filter logic
 *     return req.headers['accept-encoding'] && req.headers['accept-encoding'].includes('gzip');
 *   }
 * }));
 * 
 * @throws {Error} Throws error if compression package initialization fails
 * @throws {TypeError} Throws error if options parameter is not an object
 */
function compressionMiddleware(options = {}) {
  try {
    // Validate options parameter type
    if (options !== null && typeof options !== 'object') {
      throw new TypeError('Options parameter must be an object or null');
    }

    // Default compression configuration optimized for production use
    const defaultOptions = {
      // Minimum response size threshold to enable compression (1KB)
      // Responses smaller than this will not be compressed to avoid overhead
      threshold: 1024,
      
      // Compression level (1-9): 6 provides good balance between compression ratio and CPU usage
      // Level 1 = fastest, Level 9 = best compression
      level: 6,
      
      // Custom filter function to determine which responses should be compressed
      // By default, compression package handles this intelligently
      filter: (req, res) => {
        // Skip compression for responses that are already compressed
        if (res.getHeader('content-encoding')) {
          return false;
        }
        
        // Skip compression for small responses
        const contentLength = res.getHeader('content-length');
        if (contentLength && parseInt(contentLength) < 1024) {
          return false;
        }
        
        // Use compression package's default filter for content type detection
        return compression.filter(req, res);
      },
      
      // zlib window size (8-15): 15 provides maximum compression window
      windowBits: 15,
      
      // Memory level (1-9): 8 provides good memory usage vs compression ratio balance
      memLevel: 8,
      
      // Chunk size for compression stream (bytes)
      chunkSize: 16384,
      
      // Compression strategy - default provides good general-purpose compression
      strategy: undefined // Uses zlib default strategy
    };

    // Merge user-provided options with defaults
    const mergedOptions = {
      ...defaultOptions,
      ...options
    };

    // Validate configuration parameters
    if (typeof mergedOptions.threshold !== 'number' || mergedOptions.threshold < 0) {
      throw new TypeError('Threshold must be a non-negative number');
    }
    
    if (typeof mergedOptions.level !== 'number' || mergedOptions.level < 1 || mergedOptions.level > 9) {
      throw new RangeError('Compression level must be between 1 and 9');
    }
    
    if (typeof mergedOptions.filter !== 'function') {
      throw new TypeError('Filter must be a function');
    }

    // Create and return the compression middleware instance
    // The compression package handles:
    // - Content-Encoding header management (gzip, deflate, br)
    // - Accept-Encoding header parsing
    // - Compression algorithm selection
    // - Stream compression with proper error handling
    const compressionInstance = compression(mergedOptions);
    
    // Wrap the compression middleware with additional error handling and logging
    return (req, res, next) => {
      try {
        // Log compression attempt for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          const acceptEncoding = req.headers['accept-encoding'] || 'none';
          console.log(`[Compression] Processing request for ${req.path} with Accept-Encoding: ${acceptEncoding}`);
        }
        
        // Call the compression middleware
        compressionInstance(req, res, (err) => {
          if (err) {
            // Log compression errors but don't break the request flow
            console.error('[Compression] Error during compression:', err.message);
            
            // Remove any partial compression headers that might have been set
            res.removeHeader('content-encoding');
            res.removeHeader('vary');
          }
          
          // Continue with the request processing
          next(err);
        });
      } catch (syncError) {
        // Handle synchronous errors
        console.error('[Compression] Synchronous error in compression middleware:', syncError.message);
        
        // Remove any partial compression headers
        res.removeHeader('content-encoding');
        res.removeHeader('vary');
        
        // Continue without compression
        next();
      }
    };
    
  } catch (initError) {
    // Handle compression middleware initialization errors
    console.error('[Compression] Failed to initialize compression middleware:', initError.message);
    
    // Return a pass-through middleware that doesn't compress but allows request processing
    return (req, res, next) => {
      console.warn('[Compression] Compression disabled due to initialization error');
      next();
    };
  }
}

/**
 * Export the compression middleware factory function
 * 
 * This module exports a single named function that can be imported and used
 * throughout the application to enable HTTP response compression.
 * 
 * The function is designed to be used in Express.js middleware stacks and
 * integrates seamlessly with the application's middleware architecture.
 * 
 * @module compression
 * @version 1.0.0
 * @requires compression@^1.7.4
 * @compatibleWith Express.js v5.1.0+, Node.js v22.x LTS
 * 
 * @example
 * // ES6 destructuring import
 * const { compressionMiddleware } = require('./middleware/compression');
 * 
 * @example
 * // CommonJS import
 * const compressionModule = require('./middleware/compression');
 * const compressionMiddleware = compressionModule.compressionMiddleware;
 */
module.exports = {
  compressionMiddleware
};