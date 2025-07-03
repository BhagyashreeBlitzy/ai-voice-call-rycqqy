# Node.js Tutorial Backend - Production-Ready Dockerfile
# This Dockerfile creates a containerized deployment of the Node.js tutorial backend
# demonstrating production-ready Docker practices for Express.js v5.1.0 applications.
#
# Features:
# - Multi-stage build for optimized production images
# - Node.js v22.x LTS (Alpine) for minimal attack surface
# - Production-only dependency installation
# - Non-root user execution for security
# - Environment variable configuration support
# - Health check endpoint integration
# - Graceful shutdown signal handling
# - Container orchestration readiness (Kubernetes, Docker Swarm)
#
# Build: docker build -t nodejs-tutorial-backend .
# Run: docker run -p 3000:3000 --env-file .env nodejs-tutorial-backend

# ==============================================================================
# STAGE 1: Build Stage - Dependency Installation and Application Preparation
# ==============================================================================
FROM node:22-alpine AS builder

# Set build-time labels for container metadata
LABEL stage=builder
LABEL description="Build stage for Node.js tutorial backend dependency installation"

# Install build dependencies for native module compilation
# These are only needed during the build process and won't be in the final image
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create application directory with proper permissions
# Using /usr/src/app as per Node.js Docker best practices
WORKDIR /usr/src/app

# Copy package management files first for optimal Docker layer caching
# This allows dependency installation to be cached unless package files change
COPY package*.json ./

# Install ALL dependencies (including devDependencies) for build stage
# Using npm ci for faster, reproducible, and deterministic builds
# --no-audit skips security audit in build for faster execution
RUN npm ci --no-audit

# Copy application source code
# The .dockerignore file controls which files are excluded from the build context
COPY . .

# Run any build/preparation tasks if needed
# For this tutorial application, no build step is required
# In more complex applications, this might include:
# - TypeScript compilation
# - Asset bundling
# - Code minification
# - Static analysis

# ==============================================================================
# STAGE 2: Production Stage - Runtime Environment
# ==============================================================================
FROM node:22-alpine AS production

# Set production-time labels for container metadata and traceability
LABEL maintainer="Tutorial Authors"
LABEL version="1.0.0"
LABEL description="Production-ready Node.js tutorial backend with Express.js v5.1.0"
LABEL org.opencontainers.image.title="Node.js Tutorial Backend"
LABEL org.opencontainers.image.description="Educational Node.js HTTP server with /hello endpoint"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="Tutorial Authors"
LABEL org.opencontainers.image.source="https://github.com/tutorial/nodejs-tutorial-backend"
LABEL org.opencontainers.image.documentation="https://github.com/tutorial/nodejs-tutorial-backend#readme"
LABEL org.opencontainers.image.licenses="MIT"

# Install security updates and minimal runtime dependencies
# dumb-init provides proper signal handling for Node.js in containers
# ca-certificates ensures TLS/SSL connections work properly
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create a non-root user for security
# Using the standard 'node' user that comes with the Node.js Alpine image
# This follows the principle of least privilege for container security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create application directory with proper ownership
WORKDIR /usr/src/app

# Copy package files for production dependency installation
COPY package*.json ./

# Install only production dependencies
# --omit=dev excludes devDependencies from the final image
# --no-audit skips security audit for faster builds
# --ci ensures reproducible builds using package-lock.json
RUN npm ci --omit=dev --no-audit && \
    npm cache clean --force

# Copy application source code from builder stage
# This includes all source files but excludes development dependencies
COPY --from=builder /usr/src/app/app.js ./
COPY --from=builder /usr/src/app/config ./config
COPY --from=builder /usr/src/app/controllers ./controllers
COPY --from=builder /usr/src/app/middleware ./middleware
COPY --from=builder /usr/src/app/routes ./routes
COPY --from=builder /usr/src/app/scripts ./scripts
COPY --from=builder /usr/src/app/utils ./utils

# Set proper file ownership for the application directory
# This ensures the non-root user can access all application files
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user for security
# All subsequent commands and the final container process run as this user
USER nodejs

# Set production environment variables
# NODE_ENV=production enables Express.js production optimizations:
# - Caches view templates
# - Caches CSS files generated from CSS extensions
# - Generates less verbose error messages
# - Optimizes performance for production workloads
ENV NODE_ENV=production

# Set default environment variables with production-appropriate values
# These can be overridden at runtime using docker run -e or docker-compose
ENV PORT=3000
ENV REQUEST_TIMEOUT_MS=30000
ENV LOG_LEVEL=info

# Expose the HTTP port
# This is the port the Express.js server will listen on
# Can be overridden by setting the PORT environment variable
EXPOSE 3000

# Add health check for container orchestration
# This endpoint is used by Docker, Kubernetes, and other orchestration tools
# to determine if the container is healthy and ready to receive traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); \
        const options = { hostname: 'localhost', port: process.env.PORT || 3000, path: '/hello', timeout: 3000 }; \
        const req = http.request(options, (res) => { \
            if (res.statusCode === 200) { process.exit(0); } \
            else { process.exit(1); } \
        }); \
        req.on('error', () => process.exit(1)); \
        req.on('timeout', () => process.exit(1)); \
        req.end();"

# Use dumb-init for proper signal handling
# This ensures that the Node.js process receives and handles termination signals correctly
# Critical for graceful shutdown in container orchestration environments
ENTRYPOINT ["dumb-init", "--"]

# Start the application using the production entry point
# Uses the main application file directly for optimal performance
# The app.js file includes comprehensive error handling and graceful shutdown logic
CMD ["node", "app.js"]

# ==============================================================================
# CONTAINER USAGE EXAMPLES
# ==============================================================================
#
# Build the container:
# docker build -t nodejs-tutorial-backend .
#
# Run with default settings:
# docker run -p 3000:3000 nodejs-tutorial-backend
#
# Run with custom environment variables:
# docker run -p 4000:4000 -e PORT=4000 -e NODE_ENV=production nodejs-tutorial-backend
#
# Run with environment file:
# docker run -p 3000:3000 --env-file .env nodejs-tutorial-backend
#
# Run in detached mode with name:
# docker run -d --name tutorial-backend -p 3000:3000 nodejs-tutorial-backend
#
# Check container health:
# docker ps
# docker exec tutorial-backend node -e "console.log('Health check:', require('http').get('http://localhost:3000/hello'))"
#
# View logs:
# docker logs tutorial-backend
#
# Stop gracefully:
# docker stop tutorial-backend
#
# ==============================================================================
# KUBERNETES DEPLOYMENT EXAMPLE
# ==============================================================================
#
# apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: nodejs-tutorial-backend
# spec:
#   replicas: 3
#   selector:
#     matchLabels:
#       app: nodejs-tutorial-backend
#   template:
#     metadata:
#       labels:
#         app: nodejs-tutorial-backend
#     spec:
#       containers:
#       - name: backend
#         image: nodejs-tutorial-backend:latest
#         ports:
#         - containerPort: 3000
#         env:
#         - name: NODE_ENV
#           value: "production"
#         - name: PORT
#           value: "3000"
#         - name: REQUEST_TIMEOUT_MS
#           value: "30000"
#         livenessProbe:
#           httpGet:
#             path: /hello
#             port: 3000
#           initialDelaySeconds: 10
#           periodSeconds: 30
#         readinessProbe:
#           httpGet:
#             path: /hello
#             port: 3000
#           initialDelaySeconds: 5
#           periodSeconds: 10
#         resources:
#           requests:
#             cpu: 100m
#             memory: 128Mi
#           limits:
#             cpu: 200m
#             memory: 256Mi