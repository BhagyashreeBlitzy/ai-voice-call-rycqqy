# syntax=docker/dockerfile:1
# =============================================================================
# Node.js Tutorial Backend - Production-Ready Dockerfile
# =============================================================================
# 
# This Dockerfile builds a secure, minimal, and production-ready container image
# for the Node.js tutorial backend application using Express 5.1.0 and Node.js
# 22.x LTS. It follows Docker best practices, security guidelines, and educational
# principles for containerizing Node.js applications.
#
# Build: docker build -t nodejs-tutorial-backend -f infrastructure/docker/Dockerfile .
# Run: docker run -p 3000:3000 --env-file src/backend/.env nodejs-tutorial-backend
# =============================================================================

# -----------------------------------------------------------------------------
# BUILD ARGUMENTS AND BASE IMAGE SELECTION
# -----------------------------------------------------------------------------

# Build-time argument for Node.js version selection
# Default to Node.js 22.x LTS for optimal long-term support and security
# Can be overridden during build: docker build --build-arg NODE_VERSION=18 ...
ARG NODE_VERSION=22

# Use the official Node.js LTS Alpine base image for minimal attack surface
# Alpine Linux provides a security-oriented, lightweight distribution with
# automatic security updates and minimal package footprint
# Node.js 22.x LTS officially transitioned to Active LTS on October 29, 2024
FROM node:${NODE_VERSION}-alpine AS base

# Set metadata labels for container identification and maintenance
LABEL maintainer="Tutorial Authors" \
      version="1.0.0" \
      description="Node.js tutorial backend demonstrating Express 5.1.0 and modern containerization" \
      nodejs.version="${NODE_VERSION}" \
      express.version="5.1.0" \
      security.scan="enabled" \
      educational.purpose="Node.js containerization tutorial"

# -----------------------------------------------------------------------------
# SECURITY HARDENING AND SYSTEM CONFIGURATION
# -----------------------------------------------------------------------------

# Install security updates and essential packages
# dumb-init provides proper signal handling for containerized Node.js processes
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create a non-root user for security best practices
# Running as root violates container security principles
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set the working directory inside the container
# Use a standard application directory structure
WORKDIR /usr/src/app

# Change ownership of the working directory to the nodejs user
RUN chown -R nodejs:nodejs /usr/src/app

# Switch to the non-root user for all subsequent operations
USER nodejs

# -----------------------------------------------------------------------------
# DEPENDENCY INSTALLATION AND OPTIMIZATION
# -----------------------------------------------------------------------------

# Copy dependency manifests first for optimal Docker layer caching
# This ensures dependencies are only reinstalled when package files change
COPY --chown=nodejs:nodejs src/backend/package.json src/backend/package-lock.json ./

# Install production dependencies only using npm ci for deterministic builds
# npm ci provides faster, reliable, reproducible builds for production
# --omit=dev ensures development dependencies are excluded from the image
# --only=production provides additional assurance for production-only installs
RUN npm ci --omit=dev --only=production && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# APPLICATION SOURCE CODE DEPLOYMENT
# -----------------------------------------------------------------------------

# Copy application source code with proper ownership
# Exclude development files and sensitive information
COPY --chown=nodejs:nodejs src/backend/app.js ./
COPY --chown=nodejs:nodejs src/backend/server.js ./
COPY --chown=nodejs:nodejs src/backend/config/ ./config/
COPY --chown=nodejs:nodejs src/backend/routes/ ./routes/
COPY --chown=nodejs:nodejs src/backend/middleware/ ./middleware/
COPY --chown=nodejs:nodejs src/backend/utils/ ./utils/
COPY --chown=nodejs:nodejs src/backend/scripts/ ./scripts/

# Copy environment configuration template
# .env.example serves as the default configuration template
COPY --chown=nodejs:nodejs src/backend/.env.example ./.env

# -----------------------------------------------------------------------------
# RUNTIME ENVIRONMENT CONFIGURATION
# -----------------------------------------------------------------------------

# Set Node.js environment to production for optimal performance and security
# This enables Express.js production optimizations and security features
ENV NODE_ENV=production

# Configure default port (can be overridden at runtime)
# Port 3000 is the standard development port for Node.js applications
ENV PORT=3000

# Set additional Node.js runtime optimizations
# Disable source map support for production builds
ENV NODE_OPTIONS="--no-source-maps"

# Configure timezone for consistent logging and operations
ENV TZ=UTC

# -----------------------------------------------------------------------------
# NETWORK AND SECURITY CONFIGURATION
# -----------------------------------------------------------------------------

# Expose the application port
# This documents the port but does not publish it (use -p flag when running)
EXPOSE 3000

# Set security-focused file permissions
# Ensure application files are readable but not writable
RUN chmod -R 644 /usr/src/app && \
    chmod +x /usr/src/app/scripts/start.js

# -----------------------------------------------------------------------------
# HEALTH CHECK CONFIGURATION
# -----------------------------------------------------------------------------

# Configure container health check for monitoring and orchestration
# Health checks enable Docker and orchestrators to monitor application status
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "
    const http = require('http');
    const options = {
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/hello',
        method: 'GET',
        timeout: 5000
    };
    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            console.log('Health check passed');
            process.exit(0);
        } else {
            console.log('Health check failed:', res.statusCode);
            process.exit(1);
        }
    });
    req.on('error', (err) => {
        console.log('Health check error:', err.message);
        process.exit(1);
    });
    req.on('timeout', () => {
        console.log('Health check timeout');
        req.destroy();
        process.exit(1);
    });
    req.end();
    "

# -----------------------------------------------------------------------------
# CONTAINER ENTRYPOINT AND COMMAND
# -----------------------------------------------------------------------------

# Use dumb-init as the entrypoint for proper signal handling
# This ensures graceful shutdown and prevents zombie processes
ENTRYPOINT ["dumb-init", "--"]

# Define the command to run the application
# Use the main server entry point for direct execution
# Express 5.1.0 with automatic promise rejection handling is fully supported
CMD ["node", "server.js"]

# -----------------------------------------------------------------------------
# MULTI-STAGE BUILD OPTIMIZATION (OPTIONAL)
# -----------------------------------------------------------------------------
# Note: For educational purposes, this Dockerfile uses a single stage.
# Production applications may benefit from multi-stage builds for further
# optimization, separating build dependencies from runtime dependencies.

# -----------------------------------------------------------------------------
# CONTAINER EXECUTION NOTES
# -----------------------------------------------------------------------------
# 
# Build the image:
#   docker build -t nodejs-tutorial-backend -f infrastructure/docker/Dockerfile .
#
# Run the container:
#   docker run -p 3000:3000 --env-file src/backend/.env nodejs-tutorial-backend
#
# Run with custom environment variables:
#   docker run -p 8080:8080 -e PORT=8080 -e NODE_ENV=development nodejs-tutorial-backend
#
# Run with volume mounting for development:
#   docker run -p 3000:3000 -v $(pwd)/src/backend:/usr/src/app nodejs-tutorial-backend
#
# Health check verification:
#   docker exec <container_id> wget -qO- http://localhost:3000/hello
#
# Container inspection:
#   docker inspect nodejs-tutorial-backend
#
# Security scanning:
#   docker scan nodejs-tutorial-backend
#
# -----------------------------------------------------------------------------
# SECURITY CONSIDERATIONS
# -----------------------------------------------------------------------------
#
# 1. Uses minimal Alpine Linux base image for reduced attack surface
# 2. Runs as non-root user (nodejs:nodejs) for security isolation
# 3. Installs only production dependencies to minimize vulnerabilities
# 4. Implements proper file permissions and ownership
# 5. Uses dumb-init for proper signal handling and process management
# 6. Enables health checks for monitoring and automated recovery
# 7. Excludes development files and sensitive information
# 8. Follows Docker security best practices and CIS benchmarks
#
# -----------------------------------------------------------------------------
# PERFORMANCE OPTIMIZATIONS
# -----------------------------------------------------------------------------
#
# 1. Leverages Docker layer caching for dependency installation
# 2. Uses npm ci for faster, deterministic dependency installation
# 3. Minimizes image size through Alpine Linux and production-only deps
# 4. Enables Node.js production optimizations via NODE_ENV
# 5. Implements health checks for automated monitoring
# 6. Optimizes file permissions and ownership for security and performance
#
# -----------------------------------------------------------------------------
# EDUCATIONAL OBJECTIVES
# -----------------------------------------------------------------------------
#
# This Dockerfile demonstrates:
# 1. Container security best practices for Node.js applications
# 2. Multi-layered approach to Docker image optimization
# 3. Production-ready configuration management
# 4. Health check implementation for monitoring
# 5. Proper signal handling in containerized environments
# 6. Educational clarity while maintaining production standards
#
# =============================================================================