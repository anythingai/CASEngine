# Use official Node.js runtime as the base image
FROM node:18.17.0-alpine AS base

# Install dependencies needed for native npm packages
RUN apk add --no-cache libc6-compat python3 make g++

# Set working directory
WORKDIR /app

# Copy root package.json and package-lock.json
COPY package*.json ./
COPY turbo.json ./

# Copy workspace configuration
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Build stage
FROM base AS builder

# Install all dependencies (including dev dependencies)
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first
RUN npm run build --workspace=@cultural-arbitrage/shared

# Build the API
RUN npm run build --workspace=@cultural-arbitrage/api

# Production stage
FROM node:18.17.0-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cultural-arbitrage -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=cultural-arbitrage:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=cultural-arbitrage:nodejs /app/apps/api/package*.json ./
COPY --from=builder --chown=cultural-arbitrage:nodejs /app/packages/shared/dist ./node_modules/@cultural-arbitrage/shared/dist
COPY --from=builder --chown=cultural-arbitrage:nodejs /app/packages/shared/package.json ./node_modules/@cultural-arbitrage/shared/

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Create logs directory
RUN mkdir -p logs && chown cultural-arbitrage:nodejs logs

# Switch to non-root user
USER cultural-arbitrage

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/health', (res) => { \
        if (res.statusCode === 200) { \
            process.exit(0); \
        } else { \
            process.exit(1); \
        } \
    }).on('error', () => { \
        process.exit(1); \
    });"

# Expose port
EXPOSE 8000

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]