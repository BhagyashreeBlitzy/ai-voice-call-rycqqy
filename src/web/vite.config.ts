import { defineConfig } from 'vite'; // ^4.0.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // ^4.2.0

export default defineConfig(({ mode }) => ({
  // React and TypeScript plugins configuration
  plugins: [
    react({
      // Enable fast refresh for development
      fastRefresh: true,
      // Enable JSX runtime for production builds
      jsxRuntime: 'automatic',
      // Enable babel plugins for development
      babel: {
        plugins: mode === 'development' ? ['react-refresh/babel'] : []
      }
    }),
    // Enable TypeScript path aliases resolution
    tsconfigPaths()
  ],

  // Development server configuration
  server: {
    // Server port configuration
    port: 3000,
    // Enable host for network access
    host: true,
    // Proxy configuration for API and WebSocket endpoints
    proxy: {
      // REST API proxy configuration
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      // WebSocket proxy configuration
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        secure: false
      }
    },
    // Enable HMR with overlay
    hmr: {
      overlay: true
    }
  },

  // Production build configuration
  build: {
    // Output directory for production builds
    outDir: 'dist',
    // Enable source maps for debugging
    sourcemap: true,
    // Browser compatibility targets based on requirements
    target: [
      'chrome83',
      'firefox78',
      'safari14',
      'edge88'
    ],
    // Increase chunk size warning limit for larger bundles
    chunkSizeWarningLimit: 1000,
    // Rollup build options
    rollupOptions: {
      output: {
        // Optimize chunk size
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            '@reduxjs/toolkit',
            'socket.io-client'
          ]
        }
      }
    }
  },

  // Module resolution configuration
  resolve: {
    // Path aliases configuration
    alias: {
      '@': '/src'
    }
  },

  // Dependency optimization configuration
  optimizeDeps: {
    // Include dependencies for optimization
    include: [
      'react',
      'react-dom',
      '@reduxjs/toolkit',
      'socket.io-client'
    ],
    // Enable dependency pre-bundling
    esbuildOptions: {
      target: 'es2020'
    }
  },

  // Enable type checking in development
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },

  // CSS configuration
  css: {
    // Enable CSS modules
    modules: {
      localsConvention: 'camelCase'
    },
    // Enable source maps for CSS
    devSourcemap: true
  }
}));