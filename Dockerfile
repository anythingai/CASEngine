# Multi-stage Dockerfile for Cultural Arbitrage Monorepo
FROM node:18-alpine AS base

# Install dependencies for native compilation
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@latest

# Copy package files
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

# Build shared package and all apps
RUN turbo build

# ================================
# API Production Stage
# ================================
FROM node:18-alpine AS api
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built API application
COPY --from=base --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=base --chown=nodejs:nodejs /app/apps/api/package*.json ./apps/api/
COPY --from=base --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=base --chown=nodejs:nodejs /app/packages/shared/package*.json ./packages/shared/
COPY --from=base --chown=nodejs:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy only environment examples (NOT actual .env with secrets)
COPY --from=base --chown=nodejs:nodejs /app/apps/api/.env.example ./apps/api/.env.example

USER nodejs

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["dumb-init", "node", "apps/api/dist/index.js"]

# ================================
# Web Production Stage
# ================================
FROM node:18-alpine AS web
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy Next.js standalone build
COPY --from=base --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=base --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

# Copy only environment examples (NOT actual .env with secrets)
COPY --from=base --chown=nodejs:nodejs /app/apps/web/.env.local.example ./apps/web/.env.local.example

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["dumb-init", "node", "apps/web/server.js"]