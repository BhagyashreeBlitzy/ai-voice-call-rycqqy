/**
 * Controllers Index Module
 * 
 * Aggregates and re-exports all controller modules for the backend application.
 * This index file serves as a single entry point for controller imports, enabling
 * clean and maintainable import patterns throughout the application.
 * 
 * Design Pattern: Central Export Aggregation
 * - Promotes modular architecture with clear separation of concerns
 * - Enables consistent import patterns: import { controllerName } from '../controllers'
 * - Supports future extensibility as additional controllers are added
 * - Simplifies refactoring and dependency management
 * 
 * Usage:
 * // Instead of: import { helloController } from '../controllers/helloController.js'
 * // Use this:    import { helloController } from '../controllers'
 * 
 * Future Extension Pattern:
 * As new controllers are added (e.g., userController, authController), they should
 * be imported and re-exported here following the same pattern:
 * 
 * const { userController } = require('./userController.js');
 * const { authController } = require('./authController.js');
 * 
 * module.exports = {
 *     helloController,
 *     userController,
 *     authController
 * };
 */

// Import the helloController function from the helloController module
// This controller handles GET requests to the /hello endpoint, returning "Hello world"
const { helloController } = require('./helloController.js');

/**
 * Re-export all controller functions for external consumption
 * 
 * This aggregation pattern enables:
 * 1. Clean imports in route modules: import { helloController } from '../controllers'
 * 2. Single source of truth for all controller exports
 * 3. Easy extension when new controllers are added
 * 4. Consistent naming and export patterns across the application
 * 
 * Current Controllers:
 * - helloController: Handles GET /hello endpoint with "Hello world" response
 * 
 * Route modules can import controllers using destructuring:
 * const { helloController } = require('../controllers');
 * app.get('/hello', helloController);
 */
module.exports = {
    helloController
};