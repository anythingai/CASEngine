# 🚀 Production Deployment Guide

This guide covers deploying the Cultural Arbitrage monorepo to production with enterprise-grade security, monitoring, and scalability.

## 🔒 Security Checklist (CRITICAL)

### 1. Environment Variables Setup

**NEVER commit real secrets to version control!**

1. Copy the production template:

   ```bash
   cp .env.production .env
   ```

2. **GENERATE STRONG SECRETS**:

   ```bash
   # Generate a strong JWT secret (32+ characters)
   openssl rand -hex 32
   
   # Generate a strong API key
   openssl rand -hex 24
   
   # Generate Redis password
   openssl rand -hex 16
   ```

3. **Update `.env` with your actual values**:
   - Replace all `your_*_here` placeholders
   - Use your real API keys for Azure OpenAI, CoinGecko, etc.
   - Set production domain names
   - Configure strong passwords

### 2. SSL/TLS Certificate Setup

**Option A: Let's Encrypt (Recommended)**

```bash
# Install Certbot
sudo apt-get update && sudo apt-get install certbot

# Get SSL certificates
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Copy certificates to ssl directory
mkdir -p ssl/certs ssl/private
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/certs/your-domain.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/private/your-domain.key
sudo chown $USER:$USER ssl/certs/* ssl/private/*
```

**Option B: Custom Certificates**

```bash
# Create ssl directories
mkdir -p ssl/certs ssl/private

# Copy your certificates
cp your-domain.crt ssl/certs/
cp your-domain.key ssl/private/

# Set proper permissions
chmod 644 ssl/certs/your-domain.crt
chmod 600 ssl/private/your-domain.key
```

### 3. Update Configuration Files

**Update `nginx.conf`**:

- Replace `your-domain.com` with your actual domain
- Update SSL certificate paths if different
- Adjust CORS origins
- Configure rate limiting as needed

**Update `docker-compose.prod.yml`**:

- Set resource limits based on your server specs
- Configure monitoring passwords
- Update volume paths if needed

## 🚀 Production Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose V2
- 4GB+ RAM recommended
- 20GB+ disk space

### 1. Clone and Setup

```bash
# Clone your repository
git clone https://github.com/your-org/cultural-arbitrage.git
cd cultural-arbitrage

# Setup environment (see Security Checklist above)
cp .env.production .env
# Edit .env with your actual values
```

### 2. Deploy with SSL and Monitoring

```bash
# Production deployment with full stack
docker-compose -f docker-compose.prod.yml up -d

# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Development/Testing Deployment (No SSL)

```bash
# Simple deployment for development
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📊 Monitoring & Health Checks

### Access Monitoring Tools

- **Application**: <https://your-domain.com>
- **API Health**: <https://api.your-domain.com/health>
- **Prometheus**: <http://your-server:9090>
- **Grafana**: <http://your-server:3001>
  - Default: admin / (set GRAFANA_ADMIN_PASSWORD)

### Health Check Endpoints

```bash
# API Health
curl https://api.your-domain.com/health

# Web App Health
curl https://your-domain.com

# Check all container health
docker-compose ps
```

## 🔧 Maintenance

### Updates and Rebuilds

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Certificate Renewal (Let's Encrypt)

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Renew certificates
sudo certbot renew

# Update Docker containers
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/certs/your-domain.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/private/your-domain.key
docker-compose -f docker-compose.prod.yml restart nginx
```

### Backup and Restore

```bash
# Backup volumes
docker run --rm -v cultural-arbitrage_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .
docker run --rm -v cultural-arbitrage_grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana-backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v cultural-arbitrage_redis_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/redis-backup.tar.gz"
```

## 🔍 Troubleshooting

### Common Issues

**1. SSL Certificate Issues**

```bash
# Check certificate validity
openssl x509 -in ssl/certs/your-domain.crt -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

**2. Environment Variable Issues**

```bash
# Check container environment
docker-compose -f docker-compose.prod.yml exec api printenv

# Validate .env file
cat .env | grep -E "^[A-Z_]+=.+"
```

**3. Service Not Starting**

```bash
# Check specific service logs
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web

# Check resource usage
docker stats
```

**4. Network Issues**

```bash
# Test internal service communication
docker-compose -f docker-compose.prod.yml exec web curl http://api:8000/health

# Check network configuration
docker network ls
docker network inspect cultural-arbitrage-network
```

## 🛡️ Security Best Practices

### Firewall Configuration

```bash
# Basic firewall setup (Ubuntu/Debian)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Regular Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Log Monitoring

```bash
# Monitor access logs
tail -f /var/lib/docker/volumes/cultural-arbitrage_nginx_logs/_data/access.log

# Monitor error logs
tail -f /var/lib/docker/volumes/cultural-arbitrage_nginx_logs/_data/error.log
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale API service
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Scale Web service
docker-compose -f docker-compose.prod.yml up -d --scale web=2
```

### Load Balancing

The nginx configuration supports multiple backend servers. Update the upstream blocks in `nginx.conf` to add more servers.

## 🆘 Emergency Procedures

### Quick Rollback

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Deploy previous version
git checkout previous-working-commit
docker-compose -f docker-compose.prod.yml up -d
```

### Data Recovery

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore from backup
docker run --rm -v cultural-arbitrage_redis_data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/redis-backup.tar.gz"

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

---

## ✅ Production Readiness Checklist

Before going live, ensure:

- [ ] Strong JWT_SECRET and API_KEY generated
- [ ] All API keys updated with real values
- [ ] SSL certificates installed and valid
- [ ] Domain names configured in nginx.conf
- [ ] CORS origins set to production domains
- [ ] Firewall configured
- [ ] Monitoring dashboards configured
- [ ] Backup procedures tested
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Emergency procedures documented

**Your Cultural Arbitrage platform is now production-ready! 🎉**
