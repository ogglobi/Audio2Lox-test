# Multi-stage build for optimal image size

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install required system packages for audio and serial
RUN apk add --no-cache \
    alsa-lib \
    pulseaudio \
    dbus \
    ca-certificates \
    tini

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create non-root user (good practice)
RUN addgroup -g 1000 audiouser && \
    adduser -D -u 1000 -G audiouser audiouser && \
    chown -R audiouser:audiouser /app

USER audiouser

# Expose ports
# 7090: HTTP API
# 7091: Websocket
# 7095: Alternative API port
EXPOSE 7090 7091 7095

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7090/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/server.js"]
