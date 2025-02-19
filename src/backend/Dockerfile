# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies and pnpm
RUN apk add --no-cache python3 make g++ curl \
    && curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

# Build TypeScript application
RUN pnpm run build

# Generate Prisma client
RUN pnpm run prisma:generate

# -----------------------------
# Stage 2: Production
# -----------------------------
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create non-root user/group
RUN addgroup -g 1000 nodejs && \
    adduser -u 1000 -G nodejs -s /bin/sh -D nodejs

# Install production dependencies
RUN apk add --no-cache curl tzdata

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create and set permissions for volumes
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/logs /app/uploads && \
    chmod 755 /app/logs /app/uploads

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:3000/health || exit 1

# Set capabilities
RUN apk add --no-cache libcap && \
    setcap 'cap_net_bind_service=+ep' /usr/local/bin/node && \
    apk del libcap

# Switch to non-root user
USER nodejs

# Set entry command
CMD ["node", "dist/server.js"]