# Multi-stage Dockerfile for WhatsApp Agent Web
# Stage 1: Build wacli (Go)
FROM golang:1.25-alpine AS go-builder

# Install build dependencies for CGO (sqlite3)
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Clone and build wacli
WORKDIR /build
RUN apk add --no-cache git && \
    git clone https://github.com/steipete/wacli.git . && \
    CGO_ENABLED=1 go build -tags sqlite_fts5 -ldflags="-w -s" -o /wacli ./cmd/wacli

# Stage 2: Build Next.js app
FROM node:20-alpine AS node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS production

# Install supervisord and sqlite for debugging
RUN apk add --no-cache supervisor sqlite

# Create app user and directories
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    mkdir -p /data /app && \
    chown -R nextjs:nodejs /data /app

# Copy wacli binary from go-builder
COPY --from=go-builder /wacli /usr/local/bin/wacli
RUN chmod +x /usr/local/bin/wacli

# Copy Next.js standalone build from node-builder
COPY --from=node-builder --chown=nextjs:nodejs /app/.next/standalone /app
COPY --from=node-builder --chown=nextjs:nodejs /app/.next/static /app/.next/static
COPY --from=node-builder --chown=nextjs:nodejs /app/public /app/public

# Copy supervisord configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --spider -q http://localhost:3000/api/health || exit 1

# Start supervisord
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
