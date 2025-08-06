# Docker Setup for Cultural Arbitrage Monorepo

This guide explains how to run the entire Cultural Arbitrage monorepo using Docker.

## Quick Start

1. **Build and start all services:**

   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - **Web App**: <http://localhost:3000>
   - **API**: <http://localhost:8000>
   - **API Health Check**: <http://localhost:8000/health>

## Commands

### Development Commands

```bash
# Build and start all services
docker-compose up --build

# Start services in detached mode (background)
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f web

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Commands

```bash
# Build for production
docker-compose build --no-cache

# Start production services
docker-compose up -d

# Scale services (if needed)
docker-compose up -d --scale api=2
```

## Architecture

The Docker setup uses a multi-stage build process:

### Services

- **API Service** (`cultural-arbitrage-api`):
  - Port: 8000
  - Built from Node.js 18 Alpine
  - Runs the Express API server
  - Health checks enabled

- **Web Service** (`cultural-arbitrage-web`):
  - Port: 3000
  - Built from Node.js 18 Alpine
  - Runs Next.js standalone server
  - Health checks enabled
  - Depends on API service

### Environment Configuration

The services use the existing environment files:

- **API**: `apps/api/.env`
- **Web**: `apps/web/.env`

### Network

Both services run on a custom bridge network called `cultural-arbitrage-network`, allowing them to communicate using service names (e.g., `http://api:8000`).

## Health Checks

Both services include health checks:

- **API**: Checks `/health` endpoint every 30 seconds
- **Web**: Checks root endpoint every 30 seconds

## Security Features

- Non-root user execution (nodejs:1001)
- Multi-stage builds for minimal image size
- Proper signal handling with dumb-init
- Resource isolation via Docker networks

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000 and 8000 are not in use
2. **Environment variables**: Ensure `.env` files exist in `apps/api/` and `apps/web/`
3. **Build failures**: Run `docker-compose build --no-cache` to rebuild from scratch

### Debugging

1. **View service logs**:

   ```bash
   docker-compose logs -f api
   docker-compose logs -f web
   ```

2. **Execute commands inside containers**:

   ```bash
   docker-compose exec api sh
   docker-compose exec web sh
   ```

3. **Check service health**:

   ```bash
   docker-compose ps
   ```

## Maintenance

### Updating Dependencies

```bash
# Rebuild images after dependency changes
docker-compose build --no-cache
docker-compose up
```

### Cleanup

```bash
# Remove all containers, networks, and images
docker-compose down --rmi all --volumes
```

## Production Deployment

For production deployment, consider:

1. Using environment variables instead of `.env` files
2. Setting up proper logging aggregation
3. Implementing SSL/TLS termination
4. Adding monitoring and alerting
5. Using a container orchestration platform (Kubernetes, Docker Swarm)
