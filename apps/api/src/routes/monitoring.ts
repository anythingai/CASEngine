import { Request, Response, Router } from 'express';
import { config } from '@/config/environment';
import os from 'os';
import process from 'process';

const router = Router();

// Basic health check
router.get('/health', (_req: Request, res: Response) => {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    environment: config.nodeEnv,
    service: 'cultural-arbitrage-api',
  };

  res.status(200).json(healthcheck);
});

// Detailed health check
router.get('/health/detailed', (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: {
      name: 'cultural-arbitrage-api',
      version: process.env.npm_package_version || '0.1.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      hostname: os.hostname(),
    },
    process: {
      pid: process.pid,
      memoryUsage: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
        arrayBuffers: `${Math.round(memUsage.arrayBuffers / 1024 / 1024)} MB`,
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    },
    dependencies: {
      database: 'not_configured', // Would check DB connection if configured
      redis: 'not_configured',    // Would check Redis connection if configured
      externalApis: {
        openai: config.ai.openai.apiKey ? 'configured' : 'not_configured',
        qloo: config.qloo.apiKey ? 'configured' : 'not_configured',
        coingecko: config.coingecko.apiKey ? 'configured' : 'not_configured',
        opensea: config.opensea.apiKey ? 'configured' : 'not_configured',
      },
    },
  };

  res.status(200).json(healthcheck);
});

// Readiness probe (for Kubernetes/container orchestration)
router.get('/ready', (_req: Request, res: Response) => {
  // Check if all critical dependencies are ready
  const checks = {
    server: true,
    // Add other checks as needed
    // database: await checkDatabase(),
    // redis: await checkRedis(),
  };

  const isReady = Object.values(checks).every(check => check === true);

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  }
});

// Liveness probe (for Kubernetes/container orchestration)
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Metrics endpoint (Prometheus-style)
router.get('/metrics', (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const metrics = `
# HELP cultural_arbitrage_uptime_seconds Total uptime in seconds
# TYPE cultural_arbitrage_uptime_seconds counter
cultural_arbitrage_uptime_seconds ${process.uptime()}

# HELP cultural_arbitrage_memory_usage_bytes Memory usage in bytes
# TYPE cultural_arbitrage_memory_usage_bytes gauge
cultural_arbitrage_memory_usage_bytes{type="rss"} ${memUsage.rss}
cultural_arbitrage_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}
cultural_arbitrage_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}
cultural_arbitrage_memory_usage_bytes{type="external"} ${memUsage.external}

# HELP cultural_arbitrage_process_info Process information
# TYPE cultural_arbitrage_process_info gauge
cultural_arbitrage_process_info{version="${process.env.npm_package_version || '0.1.0'}",environment="${config.nodeEnv}",node_version="${process.version}"} 1
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Performance monitoring endpoint
router.get('/performance', (_req: Request, res: Response) => {
  const startTime = process.hrtime();
  
  // Simulate some work to measure performance
  setTimeout(() => {
    const endTime = process.hrtime(startTime);
    const responseTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to milliseconds

    res.json({
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeHandles: (process as any)._getActiveHandles().length,
      activeRequests: (process as any)._getActiveRequests().length,
    });
  }, 10);
});

// API endpoints status
router.get('/status/endpoints', (_req: Request, res: Response) => {
  const endpoints = [
    { path: '/api/search/cultural-trends', method: 'GET', status: 'active' },
    { path: '/api/taste/profile', method: 'POST', status: 'active' },
    { path: '/api/taste/expand', method: 'POST', status: 'active' },
    { path: '/api/assets/search', method: 'GET', status: 'active' },
    { path: '/api/simulate/portfolio', method: 'POST', status: 'active' },
  ];

  res.json({
    timestamp: new Date().toISOString(),
    totalEndpoints: endpoints.length,
    endpoints,
  });
});

export { router as monitoringRoutes };