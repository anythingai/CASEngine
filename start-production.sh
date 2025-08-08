#!/bin/sh

# Cultural Arbitrage Production Startup Script
# Serves both API and Next.js static files in single container for Azure Web App Service

set -e

echo "🚀 Starting Cultural Arbitrage Production Server..."

# Set production environment
export NODE_ENV=production
export PORT=8000

# Navigate to API directory
cd /app/apps/api

echo "📊 Environment: $NODE_ENV"
echo "🔗 Starting API server on port $PORT"

# Check if API build exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ API build not found at dist/index.js"
    exit 1
fi

# Check if web build exists  
if [ ! -d "../web/.next" ]; then
    echo "❌ Web build not found at ../web/.next"
    exit 1
fi

echo "✅ Build files verified"
echo "🔧 Starting Cultural Arbitrage API server..."

# Start the API server (which will also serve static files)
exec node dist/index.js