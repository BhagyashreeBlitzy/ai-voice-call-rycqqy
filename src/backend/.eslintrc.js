// ESLint configuration file for the Node.js tutorial backend
// Version: ESLint ^8.0.0 - Core JavaScript linter for code quality and style enforcement
// Integrates with Prettier for formatting, Jest for test file linting, Node.js best practices, and JSDoc for documentation enforcement
// Designed for educational clarity, maintainability, and alignment with modern JavaScript/Node.js and Express.js v5.1.0 best practices

module.exports = {
    // Environment configuration - specifies which global variables are predefined
    // Node.js runtime environment for server-side JavaScript execution
    // ES2022 environment for modern ECMAScript features and syntax support
    // Jest environment for test framework globals (describe, it, expect, etc.)
    env: {
        node: true,      // Enable Node.js global variables and scoping
        es2022: true,    // Enable ES2022 global variables and automatically set parserOptions.ecmaVersion to 2022
        jest: true       // Enable Jest testing framework global variables
    },

    // Parser options configuration for ECMAScript parsing
    // Specifies the JavaScript language options ESLint should support
    parserOptions: {
        ecmaVersion: 2022,     // Set ECMAScript version to 2022 for modern syntax support
        sourceType: 'module'   // Set source type to module for ES6 import/export syntax
    },

    // Extends configuration from recommended rule sets and plugin configurations
    // Order matters: later configurations override earlier ones
    extends: [
        'eslint:recommended',           // ESLint's recommended rules for error prevention and best practices
        'plugin:prettier/recommended',  // Enables eslint-plugin-prettier and eslint-config-prettier, runs Prettier as ESLint rule
        'plugin:node/recommended',      // Node.js specific linting rules for best practices and compatibility
        'plugin:jest/recommended',      // Jest testing framework recommended rules for test files
        'plugin:jsdoc/recommended',     // JSDoc documentation linting rules for function and class documentation
        'prettier'                      // Disables ESLint rules that conflict with Prettier formatting
    ],

    // Plugins array - adds additional ESLint plugins for enhanced functionality
    // Plugins provide additional rules and environments beyond ESLint core
    plugins: [
        'prettier',  // Integrates Prettier code formatting with ESLint
        'node',      // Provides Node.js specific linting rules and environments
        'jest',      // Provides Jest testing framework specific linting rules
        'jsdoc'      // Provides JSDoc documentation linting and validation rules
    ],

    // Rules configuration - defines specific linting rules and their enforcement levels
    // 'error' (2): Rule violations cause ESLint to exit with error code
    // 'warn' (1): Rule violations are reported but don't cause build failure
    // 'off' (0): Rule is disabled completely
    rules: {
        // Prettier integration rule - runs Prettier as an ESLint rule
        // Configuration matches .prettierrc settings for consistency
        'prettier/prettier': [
            'error',
            {
                printWidth: 100,           // Maximum line width before wrapping
                tabWidth: 2,               // Number of spaces per indentation level
                useTabs: false,            // Use spaces instead of tabs for indentation
                semi: true,                // Add semicolons at the end of statements
                singleQuote: true,         // Use single quotes instead of double quotes
                trailingComma: 'es5',      // Add trailing commas where valid in ES5 (objects, arrays)
                bracketSpacing: true,      // Add spaces between brackets in object literals
                arrowParens: 'always',     // Always include parentheses around arrow function parameters
                endOfLine: 'lf'            // Use LF (Unix) line endings for cross-platform compatibility
            }
        ],

        // Console usage rule - control console.log usage in production code
        // Allows console.warn, console.error, and console.info for logging purposes
        // Warns about console.log usage to encourage proper logging practices
        'no-console': [
            'warn',
            {
                allow: ['warn', 'error', 'info']  // Allow specific console methods for legitimate logging
            }
        ],

        // Node.js ES syntax support rule - ensures compatibility with Node.js version
        // Prevents usage of unsupported ES features in specified Node.js version
        'node/no-unsupported-features/es-syntax': [
            'error',
            {
                version: '>=18.0.0',  // Target Node.js v18+ for Express.js v5.1.0 compatibility
                ignores: []           // No syntax features to ignore - enforce full compatibility
            }
        ],

        // Node.js import resolution rule - validates import statements and module resolution
        // Ensures imported modules can be resolved and exist in the project
        'node/no-missing-import': [
            'error',
            {
                tryExtensions: ['.js', '.json']  // File extensions to try when resolving imports
            }
        ],

        // JSDoc requirement rule - enforces documentation for functions and classes
        // Promotes code documentation for educational clarity and maintainability
        'jsdoc/require-jsdoc': [
            'warn',
            {
                require: {
                    FunctionDeclaration: true,     // Require JSDoc for function declarations
                    MethodDefinition: true,        // Require JSDoc for class methods
                    ClassDeclaration: true,        // Require JSDoc for class declarations
                    ArrowFunctionExpression: false, // Don't require JSDoc for arrow functions (often short/inline)
                    FunctionExpression: false      // Don't require JSDoc for function expressions (often callbacks)
                }
            }
        ],

        // JSDoc formatting rules for consistent documentation style
        'jsdoc/check-alignment': 'warn',           // Ensure proper alignment of JSDoc comments
        'jsdoc/check-indentation': 'warn',         // Ensure consistent indentation in JSDoc comments
        'jsdoc/newline-after-description': 'warn', // Require newline after JSDoc description

        // Jest testing framework rules for test quality and best practices
        'jest/no-disabled-tests': 'warn',    // Warn about disabled tests (describe.skip, it.skip)
        'jest/no-focused-tests': 'error',    // Error on focused tests (describe.only, it.only) in committed code
        'jest/no-identical-title': 'error',  // Prevent identical test titles within same describe block
        'jest/prefer-to-have-length': 'warn', // Prefer toHaveLength() over checking length property
        'jest/valid-expect': 'error'         // Ensure expect() calls are valid and properly formed
    },

    // Overrides configuration - applies different rules to specific file patterns
    // Allows customization of linting rules for different file types or directories
    overrides: [
        {
            // Test file pattern matching - applies to all Jest test files
            files: [
                '**/__tests__/**/*.js',  // Files in __tests__ directories
                '**/*.test.js'           // Files with .test.js extension
            ],
            
            // Test-specific environment configuration
            env: {
                jest: true  // Enable Jest globals for test files
            },
            
            // Test-specific plugins
            plugins: ['jest'],
            
            // Test-specific extends configuration
            extends: ['plugin:jest/recommended'],
            
            // Test-specific rules - more lenient for test files
            rules: {
                // Allow unused expressions in test files for expect().toBe() patterns
                'no-unused-expressions': 'off'
            }
        }
    ]
};