# Cultural Arbitrage - Azure Deployment Guide

This guide provides comprehensive instructions for deploying the Cultural Arbitrage Web3 trend intelligence platform to Azure Web App Service using Docker containers.

## 🎯 Overview

Cultural Arbitrage is deployed as a single container that serves both the Express.js API and Next.js frontend, optimizing costs while maintaining performance for Web3 integrations.

### Architecture

- **Single Container**: API (port 8000) + Static Frontend
- **Azure Services**: Web App Service + Container Registry
- **Build System**: Turbo monorepo with multi-stage Docker
- **Web3 Integrations**: Azure OpenAI, CoinGecko, OpenSea, Farcaster

## 📋 Prerequisites

### Required Tools

- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in
- [Docker](https://www.docker.com/get-started) installed and running
- Node.js 18+ (for local development)
- Bash shell (Linux/macOS/WSL)

### Required API Keys

Ensure you have the following API keys configured in `apps/api/.env`:

- `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`
- `COINGECKO_API_KEY`
- `OPENSEA_API_KEY`
- `FARCASTER_API_KEY`

## 🚀 Quick Start Deployment

### 1. Login to Azure

```bash
az login
az account set --subscription "Your-Subscription-Name"
```

### 2. Deploy to Azure (Automated)

```bash
# Make scripts executable
chmod +x deploy-azure.sh configure-azure-env.sh verify-deployment.sh

# Run complete deployment
./deploy-azure.sh

# Configure environment variables securely
./configure-azure-env.sh

# Verify deployment
./verify-deployment.sh https://your-app-name.azurewebsites.net
```

### 3. Manual Configuration (if needed)

If automated scripts fail, follow the [Manual Deployment](#manual-deployment) section.

## 🧪 Local Testing

Before deploying to Azure, test the production build locally:

### Test Production Build

```bash
# Build and run production container
docker-compose -f docker-compose.prod.yml up --build

# Verify in another terminal
./verify-deployment.sh http://localhost:8000

# Cleanup
docker-compose -f docker-compose.prod.yml down
```

## 📚 Manual Deployment

### Step 1: Create Azure Resources

```bash
# Set variables
RESOURCE_GROUP="cultural-arbitrage-rg"
APP_NAME="cultural-arbitrage"
ACR_NAME="culturalarbitrageacr"
LOCATION="East US"

# Create resource group
az group create --name $RESOURCE_GROUP --location "$LOCATION"

# Create container registry
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true
```

### Step 2: Build and Push Container

```bash
# Login to registry
az acr login --name $ACR_NAME

# Build and push
ACR_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)
docker build -t $ACR_SERVER/cultural-arbitrage:latest .
docker push $ACR_SERVER/cultural-arbitrage:latest
```

### Step 3: Create Web App

```bash
# Create App Service Plan
az appservice plan create \
    --name "cultural-arbitrage-plan" \
    --resource-group $RESOURCE_GROUP \
    --is-linux \
    --sku B1

# Create Web App
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "cultural-arbitrage-plan" \
    --name $APP_NAME \
    --deployment-container-image-name $ACR_SERVER/cultural-arbitrage:latest
```

### Step 4: Configure Environment Variables

Use the Azure Portal or CLI to set environment variables from `azure.env.template`.

## 🔧 Configuration Details

### Environment Variables

The application requires these key environment variables:

#### Essential Configuration

- `NODE_ENV=production`
- `PORT=8000`
- `CORS_ORIGINS=https://your-app.azurewebsites.net`

#### API Keys (Secure)

- `AZURE_OPENAI_API_KEY` - Your Azure OpenAI key
- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint
- `COINGECKO_API_KEY` - CoinGecko Pro API key
- `OPENSEA_API_KEY` - OpenSea API key
- `FARCASTER_API_KEY` - Neynar Farcaster API key

#### Security

- `JWT_SECRET` - Generate: `openssl rand -base64 64`
- `API_KEY` - Generate: `openssl rand -hex 32`

#### Performance

- `ENABLE_COMPRESSION=true`
- `RATE_LIMIT_MAX_REQUESTS=200`
- `CACHE_TTL_MEDIUM=3600`

### Azure App Service Configuration

In Azure Portal → App Service → Configuration:

1. **General Settings**:
   - Platform: Linux
   - Stack: Docker Container

2. **Application Settings**:
   - Add all environment variables from `azure.env.template`
   - Mark API keys as "Deployment slot setting" for security

3. **Container Settings**:
   - Registry: Your ACR
   - Image: `cultural-arbitrage:latest`
   - Enable Continuous Deployment

## 🔍 Monitoring & Debugging

### View Logs

```bash
# Real-time logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Download logs
az webapp log download --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Health Monitoring

- Health endpoint: `https://your-app.azurewebsites.net/health`
- API status: `https://your-app.azurewebsites.net/api`

### Performance Monitoring

- Azure Application Insights (recommended)
- Built-in Azure monitoring

## 🐛 Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Symptoms**: App shows "Application Error"

**Solutions**:

```bash
# Check logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Common fixes:
# - Verify Dockerfile builds locally
# - Check environment variables are set
# - Ensure PORT=8000 is set
```

#### 2. API Keys Not Working

**Symptoms**: API endpoints return errors, health check fails

**Solutions**:

```bash
# Verify environment variables
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP

# Re-run configuration script
./configure-azure-env.sh

# Check individual API services:
curl https://your-app.azurewebsites.net/health
```

#### 3. Frontend Not Loading

**Symptoms**: 404 errors, blank page

**Solutions**:

- Verify Next.js build completed successfully
- Check `NEXT_PUBLIC_API_URL` points to correct domain
- Ensure static files are included in Docker image

#### 4. CORS Issues

**Symptoms**: Frontend can't access API

**Solutions**:

```bash
# Update CORS origins
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings CORS_ORIGINS="https://your-app.azurewebsites.net"
```

#### 5. Performance Issues

**Symptoms**: Slow response times

**Solutions**:

- Scale up App Service Plan: `az appservice plan update --sku S1`
- Enable compression: `ENABLE_COMPRESSION=true`
- Optimize cache settings
- Consider CDN for static assets

### Web3-Specific Issues

#### Azure OpenAI Issues

```bash
# Test Azure OpenAI connectivity
curl -X POST "https://your-endpoint.openai.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview" \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

#### CoinGecko Rate Limiting

- Monitor rate limits in logs
- Consider upgrading to higher tier
- Implement proper caching

#### OpenSea API Issues

- Verify API key validity
- Check rate limiting
- Monitor for API changes

## 🔒 Security Best Practices

### API Key Management

1. **Never commit API keys** to version control
2. **Use Azure App Settings** for secure storage
3. **Rotate keys regularly**
4. **Monitor usage** for anomalies

### Container Security

1. **Use non-root user** (implemented in Dockerfile)
2. **Keep base images updated**
3. **Scan for vulnerabilities**

### Network Security

1. **Configure proper CORS origins**
2. **Use HTTPS only** (enforced by Azure)
3. **Implement rate limiting**

## 📈 Scaling & Optimization

### Horizontal Scaling

```bash
# Scale out (multiple instances)
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=false

az appservice plan update \
    --name "cultural-arbitrage-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku S2 \
    --number-of-workers 2
```

### Performance Optimization

1. **Enable compression**: `ENABLE_COMPRESSION=true`
2. **Optimize cache TTLs** based on usage patterns
3. **Use CDN** for static assets
4. **Consider Redis** for distributed caching

## 🔄 CI/CD Pipeline

For automated deployments, consider setting up:

1. **GitHub Actions** workflow
2. **Azure DevOps** pipeline
3. **Container registry webhooks**

Example GitHub Action:

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        run: ./deploy-azure.sh
```

## 📞 Support & Resources

### Azure Resources

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Container Registry Documentation](https://docs.microsoft.com/en-us/azure/container-registry/)

### Project Resources

- Health Check: `/health`
- API Documentation: `/api`
- Monitoring: Azure Portal

### Getting Help

1. Check logs first: `az webapp log tail`
2. Run verification script: `./verify-deployment.sh`
3. Review this troubleshooting guide
4. Check individual API service status

## 📋 Deployment Checklist

- [ ] Azure CLI installed and logged in
- [ ] All API keys configured in `apps/api/.env`
- [ ] Local Docker build tested
- [ ] Production compose file tested
- [ ] Azure resources created
- [ ] Container built and pushed
- [ ] Web app configured
- [ ] Environment variables set
- [ ] Deployment verified
- [ ] Health checks passing
- [ ] Frontend accessible
- [ ] API endpoints working
- [ ] Web3 integrations tested
- [ ] Performance acceptable
- [ ] Monitoring configured
- [ ] Backup strategy planned

---

**Last Updated**: $(date)
**Version**: 1.0.0
