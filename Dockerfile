# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY user-front/package*.json ./user-front/

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd user-front && npm ci

# Copy source code
COPY backend ./backend
COPY user-front ./user-front

# Build frontend
RUN cd user-front && npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/user-front/build ./user-front/build

# Create uploads directory
RUN mkdir -p /app/backend/uploads && chown -R nodejs:nodejs /app/backend/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/health-check.js || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"] 