import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables FIRST before importing config
dotenv.config();

import { config } from '@/config/environment';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { apiRoutes } from '@/routes/api';
import { monitoringRoutes } from '@/routes/monitoring';

const app = express();
const PORT = config.port;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// General middleware
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: config.nodeEnv,
  });
});

// Monitoring routes (before API routes for health checks)
app.use('/', monitoringRoutes);


// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Cultural Arbitrage API server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Azure OpenAI: ${config.ai.azure.apiKey && config.ai.azure.endpoint ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔧 CoinGecko API: ${config.coingecko.apiKey ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔧 OpenSea API: ${config.opensea.apiKey ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔧 Google Trends: ✅ Available (free service)`);
  console.log(`🔧 Farcaster API: ${config.social.farcaster.apiKey ? '✅ Configured' : '❌ Not configured (optional)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;