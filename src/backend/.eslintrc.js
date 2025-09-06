// ESLint v8.57.0 configuration for Node.js tutorial application
// Enforces JavaScript code quality with Standard style guide integration
// Optimized for Express.js v5.1.0 and Jest v29.7.0 testing framework
// Provides educational code quality enforcement with beginner-friendly error messages

module.exports = {
  // Extend Standard JavaScript style guide for comprehensive code quality
  extends: [
    'standard' // eslint-config-standard ^17.1.0
  ],

  // Configure environment support for Node.js, ES2022, and Jest
  env: {
    node: true,    // Node.js global variables and Node.js scoping
    es2022: true,  // ES2022 globals and automatically sets parserOptions.ecmaVersion
    jest: true     // Jest testing framework globals (describe, it, test, expect, etc.)
  },

  // Parser options for ECMAScript 2022 with module support
  parserOptions: {
    ecmaVersion: 2022,        // Enable ECMAScript 2022 features
    sourceType: 'module',     // Allow ES6+ import/export statements
    ecmaFeatures: {
      impliedStrict: true     // Enable strict mode for all ECMAScript code
    }
  },

  // Plugin configuration for enhanced linting capabilities
  plugins: [
    'import',   // eslint-plugin-import ^2.29.1 - ES6+ import/export validation
    'n',        // eslint-plugin-n ^16.6.2 - Node.js specific rules
    'promise'   // eslint-plugin-promise ^6.1.1 - Promise usage patterns
  ],

  // Custom rules optimized for Node.js tutorial application
  rules: {
    // Code quality rules with educational focus
    'no-console': 'warn',           // Allow console usage for tutorial debugging
    'no-unused-vars': 'error',      // Prevent unused variable declarations
    'prefer-const': 'error',        // Enforce immutability best practices
    'no-var': 'error',              // Disallow var declarations (use const/let)

    // Code style rules aligned with Prettier configuration
    'semi': ['error', 'always'],                    // Require semicolons
    'quotes': ['error', 'single'],                  // Enforce single quotes
    'indent': ['error', 2],                         // 2-space indentation
    'comma-dangle': ['error', 'es5'],               // Trailing commas where valid in ES5

    // Object and array formatting for readability
    'object-curly-spacing': ['error', 'always'],    // Spaces inside braces
    'array-bracket-spacing': ['error', 'never'],    // No spaces inside brackets

    // Function and control flow spacing
    'arrow-spacing': 'error',                       // Space around arrow functions
    'keyword-spacing': 'error',                     // Space around keywords
    'space-before-blocks': 'error',                 // Space before blocks
    'brace-style': ['error', '1tbs'],               // One true brace style

    // Node.js specific rules via eslint-plugin-n
    'n/no-unpublished-require': 'off',             // Allow dev dependencies in tutorial
    'n/no-missing-require': 'error',               // Ensure required modules exist
    'n/no-extraneous-require': 'error',            // Disallow unlisted dependencies
    'n/prefer-global/process': 'error',            // Use global process object
    'n/prefer-global/buffer': 'error',             // Use global Buffer object
    'n/prefer-global/console': 'error',            // Use global console object

    // Promise and async/await rules via eslint-plugin-promise
    'promise/always-return': 'error',              // Always return in Promise chains
    'promise/catch-or-return': 'error',            // Handle Promise rejections
    'promise/param-names': 'error',                // Standard Promise parameter names
    'promise/no-nesting': 'warn',                  // Avoid nested Promise chains
    'promise/prefer-await-to-then': 'warn',        // Prefer async/await over .then()

    // Import/export rules via eslint-plugin-import
    'import/order': ['error', {
      groups: [
        'builtin',    // Node.js built-in modules
        'external',   // NPM packages
        'internal',   // Internal modules
        'parent',     // Parent directory imports
        'sibling',    // Same directory imports
        'index'       // Index file imports
      ],
      'newlines-between': 'always'  // Require newlines between import groups
    }],
    'import/newline-after-import': 'error',        // Newline after import statements
    'import/no-duplicates': 'error',               // No duplicate imports
    'import/no-unused-modules': 'warn'             // Warn about unused modules
  },

  // Configuration overrides for test files
  overrides: [
    {
      // Test file patterns for Jest integration
      files: [
        'test/**/*.js',
        'test/**/*.test.js',
        'test/**/*.spec.js',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      env: {
        jest: true  // Enable Jest testing environment
      },
      rules: {
        // Relaxed rules for test files
        'no-console': 'off',                // Allow console usage in tests
        'max-lines': 'off',                 // No line limits for test files
        'max-lines-per-function': 'off',    // No function length limits in tests
        'prefer-arrow-callback': 'off',     // Allow regular functions in tests
        'func-names': 'off'                 // Allow anonymous functions in tests
      }
    }
  ],

  // Global variables configuration
  globals: {
    // Node.js globals (supplementing env.node)
    Buffer: 'readonly',
    process: 'readonly',
    global: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',

    // Jest testing globals (supplementing env.jest)
    describe: 'readonly',
    it: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    jest: 'readonly'
  },

  // File and directory patterns to ignore during linting
  ignorePatterns: [
    'node_modules/',         // NPM dependencies
    'coverage/',             // Jest coverage reports
    'logs/',                 // Application log files
    'tmp/',                  // Temporary files
    'dist/',                 // Distribution/build files
    'build/',                // Build artifacts
    '.git/',                 // Git version control
    '.vscode/',              // VS Code settings
    '.idea/',                // IntelliJ IDEA settings
    '*.min.js',              // Minified JavaScript files
    '*.bundle.js',           // Bundled JavaScript files
    '.DS_Store',             // macOS system files
    'Thumbs.db'              // Windows system files
  ],

  // Settings for plugin configuration
  settings: {
    // Import resolver settings for eslint-plugin-import
    'import/resolver': {
      node: {
        extensions: ['.js', '.json']  // Supported file extensions
      }
    },

    // Node.js version for eslint-plugin-n
    node: {
      version: '>=18.0.0'  // Minimum Node.js version compatibility
    }
  }
};