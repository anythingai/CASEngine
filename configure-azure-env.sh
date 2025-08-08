#!/bin/bash

# Cultural Arbitrage - Azure App Settings Configuration Script
# This script configures secure environment variables in Azure Web App Service

set -e

# Configuration
RESOURCE_GROUP="cultural-arbitrage-rg"
APP_NAME="cultural-arbitrage"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Azure CLI is installed and user is logged in
if ! command -v az &> /dev/null; then
    log_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

if ! az account show &> /dev/null; then
    log_error "Not logged into Azure CLI. Please run 'az login' first."
    exit 1
fi

log_info "🔧 Configuring Azure App Settings for Cultural Arbitrage"

# Check if .env file exists
if [ ! -f "apps/api/.env" ]; then
    log_error "apps/api/.env file not found. Please ensure it exists with your API keys."
    exit 1
fi

log_info "📖 Reading configuration from apps/api/.env"

# Source the .env file to get the values
set -a
source apps/api/.env
set +a

# Generate secure JWT secret if not provided
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    log_info "🔐 Generated new JWT secret"
fi

# Generate API key if not provided
if [ -z "$API_KEY" ] || [ "$API_KEY" = "your-api-key-for-protected-endpoints" ]; then
    API_KEY=$(openssl rand -hex 32)
    log_info "🔑 Generated new API key"
fi

log_info "⚙️  Configuring secure environment variables in Azure..."

# Configure all environment variables
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        JWT_SECRET="$JWT_SECRET" \
        API_KEY="$API_KEY" \
        AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
        AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
        AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
        AZURE_OPENAI_API_VERSION="$AZURE_OPENAI_API_VERSION" \
        COINGECKO_API_KEY="$COINGECKO_API_KEY" \
        OPENSEA_API_KEY="$OPENSEA_API_KEY" \
        FARCASTER_API_KEY="$FARCASTER_API_KEY" \
        QLOO_API_KEY="$QLOO_API_KEY" \
        QLOO_API_URL="$QLOO_API_URL" \
    --output table

log_success "✅ Secure environment variables configured successfully"

# Restart the app to apply changes
log_info "🔄 Restarting Web App to apply configuration..."
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

log_success "🎉 Configuration completed successfully!"

# Show current app settings (masked for security)
log_info "📋 Current App Settings Summary:"
az webapp config appsettings list \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --query "[?name=='NODE_ENV' || name=='PORT' || name=='CORS_ORIGINS']" \
    --output table

log_info "🔐 Security Note: API keys are configured but not displayed for security"

# Display app information
APP_URL="https://$APP_NAME.azurewebsites.net"
log_info "🌐 Application URL: $APP_URL"
log_info "🏥 Health Check: $APP_URL/health"
log_info "🔌 API Base URL: $APP_URL/api"

log_warning "⚠️  Important Security Notes:"
log_warning "   - API keys are now stored securely in Azure App Settings"
log_warning "   - Never commit these keys to version control"
log_warning "   - Generated JWT_SECRET: Store this securely for future reference"
log_warning "   - Generated API_KEY: Store this securely for API access"

log_info "📝 Next Steps:"
log_info "   1. Test the deployment: ./verify-deployment.sh $APP_URL"
log_info "   2. Monitor logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
log_info "   3. Scale if needed: az appservice plan update --name cultural-arbitrage-plan --resource-group $RESOURCE_GROUP --sku S1"

# Save generated keys to a secure file (for reference)
if [ ! -z "$JWT_SECRET" ] && [ ! -z "$API_KEY" ]; then
    echo "# Generated Keys for Cultural Arbitrage - Store Securely" > generated-keys.txt
    echo "JWT_SECRET=$JWT_SECRET" >> generated-keys.txt
    echo "API_KEY=$API_KEY" >> generated-keys.txt
    echo "# Generated on: $(date)" >> generated-keys.txt
    
    chmod 600 generated-keys.txt
    log_info "🔐 Generated keys saved to generated-keys.txt (restricted permissions)"
fi

log_success "🚀 Cultural Arbitrage is now configured and ready for production!"