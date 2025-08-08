#!/bin/bash

# Cultural Arbitrage - Azure Web App Service Deployment Script
# This script deploys the full monorepo to Azure using Docker containers

set -e

# Configuration - Update these values for your deployment
RESOURCE_GROUP="cultural-arbitrage-rg"
APP_NAME="cultural-arbitrage"
ACR_NAME="culturalarbitrageacr"
LOCATION="East US"
APP_SERVICE_PLAN="cultural-arbitrage-plan"
SKU="B1"  # Basic tier - adjust as needed

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    log_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    log_error "Not logged into Azure CLI. Please run 'az login' first."
    exit 1
fi

log_info "🚀 Starting Cultural Arbitrage Azure Deployment"
log_info "📋 Configuration:"
log_info "   Resource Group: $RESOURCE_GROUP"
log_info "   App Name: $APP_NAME"
log_info "   Container Registry: $ACR_NAME"
log_info "   Location: $LOCATION"

# Create resource group
log_info "🏗️  Creating resource group..."
az group create --name $RESOURCE_GROUP --location "$LOCATION" --output table

# Create Azure Container Registry
log_info "🐳 Creating Azure Container Registry..."
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --output table

log_success "Container Registry created successfully"

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "loginServer" --output tsv)
log_info "📍 Container Registry URL: $ACR_LOGIN_SERVER"

# Build and push Docker image
log_info "🔨 Building Docker image in Azure ACR (server-side build)..."
IMAGE_TAG="$ACR_LOGIN_SERVER/cultural-arbitrage:latest"

# Build the image in Azure (avoids local docker credential helper issues)
log_info "🏗️  Running 'az acr build' for: $IMAGE_TAG"
az acr build --registry $ACR_NAME --image cultural-arbitrage:latest .

log_success "Docker image built and pushed to ACR successfully"

# Create App Service Plan
log_info "📋 Creating App Service Plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --is-linux \
    --sku $SKU \
    --output table

# Create Web App
log_info "🌐 Creating Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $APP_NAME \
    --deployment-container-image-name $IMAGE_TAG \
    --output table

# Configure Web App for container
log_info "⚙️  Configuring Web App container settings..."

# Set the container registry credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value --output tsv)

az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $IMAGE_TAG \
    --docker-registry-server-url https://$ACR_LOGIN_SERVER \
    --docker-registry-server-user $ACR_USERNAME \
    --docker-registry-server-password $ACR_PASSWORD

# Configure Web App settings
log_info "🔧 Setting up environment variables..."

# Get the app URL for CORS configuration
APP_URL="https://$APP_NAME.azurewebsites.net"

az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        NODE_ENV=production \
        PORT=8000 \
        WEBSITES_PORT=8000 \
        LOG_LEVEL=info \
        SERVE_STATIC_FRONTEND=true \
        ENABLE_CORS=true \
        CORS_ORIGINS="$APP_URL" \
        ENABLE_RATE_LIMITING=false \
        RATE_LIMIT_WINDOW_MS=900000 \
        RATE_LIMIT_MAX_REQUESTS=200 \
        ENABLE_LOGGING=true \
        ENABLE_COMPRESSION=true \
        CACHE_TTL_SHORT=600 \
        CACHE_TTL_MEDIUM=3600 \
        CACHE_TTL_LONG=7200 \
        MAX_REQUEST_SIZE=10mb \
        REQUEST_TIMEOUT=30000 \
        HEALTH_CHECK_INTERVAL=30000 \
    --output table

log_warning "⚠️  IMPORTANT: You need to manually set the following sensitive environment variables in Azure Portal:"
log_warning "   - JWT_SECRET (generate a strong secret)"
log_warning "   - API_KEY (for protected endpoints)"
log_warning "   - AZURE_OPENAI_API_KEY"
log_warning "   - AZURE_OPENAI_ENDPOINT"
log_warning "   - COINGECKO_API_KEY"
log_warning "   - OPENSEA_API_KEY"
log_warning "   - FARCASTER_API_KEY"

# Enable continuous deployment (optional)
log_info "🔄 Enabling continuous deployment..."
az webapp deployment container config \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --enable-cd true

# Restart the app to apply changes
log_info "🔄 Restarting Web App..."
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

log_success "🎉 Deployment completed successfully!"
log_info "📱 Application URL: $APP_URL"
log_info "🏥 Health Check: $APP_URL/health"
log_info "🔌 API Endpoint: $APP_URL/api"

log_info "📝 Next steps:"
log_info "1. Go to Azure Portal > App Services > $APP_NAME > Configuration"
log_info "2. Add the sensitive API keys listed above"
log_info "3. Restart the application"
log_info "4. Test the deployment using: ./verify-deployment.sh $APP_URL"

echo ""
log_info "🔗 Quick Links:"
log_info "   - Azure Portal: https://portal.azure.com"
log_info "   - App Service: https://portal.azure.com/#@/resource/subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME"
log_info "   - Container Registry: https://portal.azure.com/#@/resource/subscriptions/{subscription}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"