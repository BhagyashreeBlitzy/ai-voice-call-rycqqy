# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --prod

# Copy source code and config files
COPY . .

# Set build arguments
ARG VITE_APP_API_URL
ARG VITE_APP_WEBSOCKET_URL
ARG VITE_APP_ENVIRONMENT
ARG NODE_ENV=production

# Build application
RUN pnpm run typecheck && \
    pnpm run build

# Production stage
FROM nginx:alpine

# Create nginx user/group
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx.default.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure nginx
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Security headers configuration
RUN echo 'add_header X-Content-Type-Options "nosniff";' >> /etc/nginx/conf.d/security-headers.conf && \
    echo 'add_header X-Frame-Options "DENY";' >> /etc/nginx/conf.d/security-headers.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block";' >> /etc/nginx/conf.d/security-headers.conf && \
    echo 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";' >> /etc/nginx/conf.d/security-headers.conf && \
    echo 'add_header Content-Security-Policy "default-src '\''self'\''; connect-src '\''self'\'' wss://*; script-src '\''self'\'' '\''unsafe-inline'\''; style-src '\''self'\'' '\''unsafe-inline'\'';";' >> /etc/nginx/conf.d/security-headers.conf

# Configure gzip compression
RUN echo 'gzip on;' >> /etc/nginx/conf.d/gzip.conf && \
    echo 'gzip_comp_level 6;' >> /etc/nginx/conf.d/gzip.conf && \
    echo 'gzip_types text/plain text/css application/javascript application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;' >> /etc/nginx/conf.d/gzip.conf

# Configure browser caching
RUN echo 'location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {' >> /etc/nginx/conf.d/cache-control.conf && \
    echo '    expires 1y;' >> /etc/nginx/conf.d/cache-control.conf && \
    echo '    add_header Cache-Control "public, max-age=31536000";' >> /etc/nginx/conf.d/cache-control.conf && \
    echo '}' >> /etc/nginx/conf.d/cache-control.conf

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl --fail http://localhost:80 || exit 1

# Expose port
EXPOSE 80

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]