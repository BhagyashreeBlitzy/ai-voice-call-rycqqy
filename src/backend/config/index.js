// Central configuration module for the Node.js tutorial backend application
// This module serves as the single import point for all configuration logic throughout the backend,
// supporting maintainable, discoverable, and educationally clear access to configuration utilities.
// 
// Educational Purpose: Demonstrates the index.js pattern for creating clean, centralized module exports
// that improve code organization and provide clear import interfaces for other parts of the application.
// This pattern is commonly used in production Node.js applications to abstract internal module structure.

// Import the validated server configuration resolver from the server configuration module
// This function provides environment-based configuration with validation and sensible defaults
const { getServerConfig } = require('./server.js');

// Re-export the server configuration resolver as the primary configuration interface
// This creates a clean abstraction layer that allows other modules to import configuration
// from a single, predictable location without needing to know the internal module structure.
//
// Usage pattern: import { getServerConfig } from './config'
// This supports the educational goal of demonstrating clean module organization and
// the practical benefit of centralized configuration access throughout the application.
//
// The getServerConfig function returns a validated configuration object containing:
// - port: number (HTTP server port, validated range 1024-65535)
// - env: string (Node.js environment: development, production, test)  
// - requestTimeoutMs: number (HTTP request timeout in milliseconds)
//
// This configuration object is used by:
// - app.js: Express application initialization and middleware configuration
// - index.js: HTTP server startup and port binding
// - Other backend modules: Environment-specific behavior and feature flags
module.exports = {
    getServerConfig
};

// Alternative export pattern for educational demonstration:
// The above module.exports approach is the standard CommonJS pattern used throughout this application.
// This provides consistency with other modules and compatibility with the Node.js ecosystem.
//
// Future enhancement: If additional configuration modules are added (e.g., database config, 
// external service config), they would be imported and re-exported here to maintain
// the single import point pattern:
//
// const { getServerConfig } = require('./server.js');
// const { getDatabaseConfig } = require('./database.js');
// const { getExternalServicesConfig } = require('./external.js');
//
// module.exports = {
//     getServerConfig,
//     getDatabaseConfig,
//     getExternalServicesConfig
// };
//
// This extension pattern maintains backward compatibility while expanding configuration capabilities
// as the application grows beyond the tutorial scope into more complex deployment scenarios.