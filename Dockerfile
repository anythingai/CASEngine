# Multi-stage Dockerfile for Cultural Arbitrage Turbo Monorepo
# Optimized for Azure Web App Service deployment

# Stage 1: Build Stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files for dependency installation
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build all packages using Turbo
RUN npm run build

# Stage 2: Production Stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy package files and install production dependencies only
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --only=production && npm cache clean --force

# Copy built applications from builder stage
# API build
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/

# Web build (Next.js static files)
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/package.json ./apps/web/
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/next.config.js ./apps/web/

# Copy shared package
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/

# Copy startup script
COPY --chown=nodejs:nodejs start-production.sh ./
RUN chmod +x start-production.sh

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["./start-production.sh"]