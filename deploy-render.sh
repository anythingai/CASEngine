#!/bin/bash
# deploy-render.sh - Helper script for Render deployment

set -e

echo "🚀 Preparing Cultural Arbitrage monorepo for Render deployment..."

# Check if required files exist
if [ ! -f "Dockerfile.render" ]; then
    echo "❌ Dockerfile.render not found!"
    exit 1
fi

if [ ! -f "ecosystem.render.js" ]; then
    echo "❌ ecosystem.render.js not found!"
    exit 1
fi

echo "✅ Render configuration files found"

# Generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo "🔑 Generated JWT_SECRET: $JWT_SECRET"
    echo "Add this to your Render environment variables!"
fi

if [ -z "$API_KEY" ]; then
    API_KEY=$(openssl rand -hex 24)
    echo "🔑 Generated API_KEY: $API_KEY"
    echo "Add this to your Render environment variables!"
fi

# Verify Docker build works locally (optional)
if [ "$1" = "--test-build" ]; then
    echo "🔨 Testing Docker build locally..."
    docker build -f Dockerfile.render -t cultural-arbitrage-render-test .
    echo "✅ Docker build successful!"
    echo "🧹 Cleaning up test image..."
    docker rmi cultural-arbitrage-render-test
fi

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes detected. Adding Render files..."
    git add Dockerfile.render ecosystem.render.js render.yaml .env.render RENDER-DEPLOYMENT.md deploy-render.sh
    git commit -m "Add Render deployment configuration"
fi

# Push to main branch
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "🎉 Your Cultural Arbitrage monorepo is ready for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com"
echo "2. Create new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Set Dockerfile path to: ./Dockerfile.render"
echo "5. Add environment variables from .env.render"
echo "6. Deploy!"
echo ""
echo "📖 For detailed instructions, see: RENDER-DEPLOYMENT.md"
echo "🔐 Don't forget to add your API keys to Render environment variables!"