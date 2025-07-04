module.exports = {
  // Environment configuration for Node.js backend with ES2022 support
  env: {
    node: true,        // Node.js global variables and Node.js scoping
    es2022: true,      // Enable ES2022 syntax and globals
    jest: true         // Jest testing framework globals
  },

  // Extend recommended configurations and plugin presets
  extends: [
    'eslint:recommended',           // ESLint core recommended rules
    'plugin:node/recommended',      // Node.js specific best practices
    'plugin:promise/recommended',   // Promise and async/await best practices
    'plugin:import/recommended',    // ES6 import/export best practices
    'prettier'                      // Prettier integration (disables conflicting rules)
  ],

  // Plugins to provide additional rules and functionality
  plugins: [
    'node',     // Node.js specific linting rules
    'promise',  // Promise-related linting rules
    'import'    // Import/export linting rules
  ],

  // Parser configuration for modern JavaScript features
  parserOptions: {
    ecmaVersion: 2022,    // Support ES2022 syntax features
    sourceType: 'module'  // Enable ES6 module syntax
  },

  // Custom rule configurations tailored for educational Node.js/Express project
  rules: {
    // Console usage rules - allow info, warn, error for logging
    'no-console': [
      'warn', 
      { 
        allow: ['warn', 'error', 'info'] 
      }
    ],

    // Variable usage rules - warn about unused variables but allow after-used args
    'no-unused-vars': [
      'warn', 
      { 
        args: 'after-used',           // Allow unused args if later args are used
        ignoreRestSiblings: true      // Ignore unused variables in rest siblings
      }
    ],

    // Undefined variable detection - critical for catching errors
    'no-undef': 'error',

    // Node.js specific rules
    'node/no-unsupported-features/es-syntax': [
      'error', 
      { 
        version: '>=18.0.0',  // Enforce Node.js 18+ compatibility
        ignores: []           // No syntax exceptions
      }
    ],

    // Import resolution for Node.js modules
    'node/no-missing-import': [
      'error', 
      { 
        tryExtensions: ['.js', '.json'] 
      }
    ],

    // Promise handling rules for Express 5 async/await patterns
    'promise/always-return': 'off',              // Allow promises without explicit return
    'promise/catch-or-return': 'error',          // Ensure promises are handled
    'promise/no-return-wrap': 'error',           // Prevent unnecessary promise wrapping

    // Import organization and validation rules
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',    // Node.js built-in modules
          'external',   // External npm packages
          'internal',   // Internal project modules
          'parent',     // Parent directory imports
          'sibling',    // Sibling file imports
          'index'       // Index file imports
        ],
        'newlines-between': 'always'  // Enforce newlines between import groups
      }
    ],

    // Import validation rules
    'import/no-unresolved': 'error',                    // Ensure imports resolve correctly
    'import/newline-after-import': 'warn',              // Newline after import statements
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/tests/**',      // Allow dev dependencies in test directories
          '**/test/**',       // Allow dev dependencies in test directories
          '**/*.test.js',     // Allow dev dependencies in test files
          '**/*.spec.js',     // Allow dev dependencies in spec files
          '**/scripts/**'     // Allow dev dependencies in script files
        ]
      }
    ],

    // Prettier integration for code formatting
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,      // Use single quotes for strings
        trailingComma: 'all',   // Add trailing commas where valid
        printWidth: 100,        // Line length limit
        tabWidth: 2,            // 2 spaces for indentation
        semi: true              // Require semicolons
      }
    ]
  },

  // Import resolver settings for Node.js module resolution
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.json']  // File extensions to resolve
      }
    }
  },

  // File-specific rule overrides
  overrides: [
    // Test files configuration - more lenient rules for testing
    {
      files: ['**/tests/**/*.js', '**/*.test.js'],
      env: {
        jest: true,   // Jest testing environment
        node: true    // Node.js environment
      },
      rules: {
        'no-unused-expressions': 'off',           // Allow unused expressions in tests
        'node/no-unpublished-require': 'off'     // Allow unpublished requires in tests
      }
    },

    // Script files configuration - allow console usage for build scripts
    {
      files: ['scripts/*.js'],
      env: {
        node: true    // Node.js environment for scripts
      },
      rules: {
        'no-console': 'off'  // Allow console usage in build/utility scripts
      }
    }
  ]
};