import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// Load environment variables FIRST before importing config
dotenv.config();

import { config } from '@/config/environment';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { apiRoutes } from '@/routes/api';
import { monitoringRoutes } from '@/routes/monitoring';

const app = express();
const PORT = config.port;

// Security middleware - Updated for Next.js static files
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js requires these
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
 origin: config.corsOrigins,
 credentials: true,
 optionsSuccessStatus: 200,
}));

// Explicitly handle CORS preflight for all routes (including /api/*)
app.options('*', cors({
 origin: config.corsOrigins,
 credentials: true,
 optionsSuccessStatus: 200,
}));

// General middleware
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Normalize duplicate /api prefixes that can occur behind proxies or rewrites
app.use((req, _res, next) => {
  // e.g. /api/api/search -> /api/search
  if (req.url.startsWith('/api/api/')) {
    const original = req.url;
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
    console.log(`[Normalize] Rewrote URL ${original} -> ${req.url}`);
  } else if (req.url === '/api/api') {
    req.url = '/api';
  }
  next();
});

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

 // Frontend handling in production
 if (config.nodeEnv === 'production') {
   // Two modes:
   // 1) serveStatic = true  -> serve pre-built Next.js output from /apps/web/.next
   // 2) serveStatic = false -> delegate to external Next server (e.g., http://localhost:3000)
   if (config.frontend?.serveStatic) {
     const webBuildPath = path.join(__dirname, '../../web');
     const nextStaticPath = path.join(webBuildPath, '.next/static');
     const publicPath = path.join(webBuildPath, 'public');

     if (existsSync(nextStaticPath)) {
       app.use('/_next/static', express.static(nextStaticPath, {
         maxAge: '31536000000',
         immutable: true
       }));
       console.log('✅ Serving Next.js static files from /_next/static');
     }

     if (existsSync(publicPath)) {
       app.use('/public', express.static(publicPath, { maxAge: '86400000' }));
       app.use(express.static(publicPath, { maxAge: '86400000' }));
       console.log('✅ Serving public assets from /public');
     }

     // Ensure /favicon.ico returns a 200 even if no ico exists; fall back to logo.png
     app.get('/favicon.ico', (_req, res) => {
       try {
         const icoPath = path.join(publicPath, 'favicon.ico');
         if (existsSync(icoPath)) {
           res.setHeader('Cache-Control', 'public, max-age=86400');
           return res.sendFile(icoPath);
         }
         const logoPath = path.join(publicPath, 'logo.png');
         if (existsSync(logoPath)) {
           res.setHeader('Content-Type', 'image/png');
           res.setHeader('Cache-Control', 'public, max-age=86400');
           return res.sendFile(logoPath);
         }
         // As a last resort, return 200 with empty body to avoid redirect by 404 handler
         res.status(200).end();
       } catch (_e) {
         res.status(200).end();
       }
     });

     // Catch-all handler for Next.js routes (static export)
     app.get('*', (req, res, next) => {
       if (req.path.startsWith('/api/') ||
           req.path.startsWith('/health') ||
           req.path.startsWith('/monitoring') ||
           req.path.includes('.')) {
         return next();
       }
       const indexPath = path.join(webBuildPath, '.next/server/app/index.html');
       if (existsSync(indexPath)) {
         return res.sendFile(indexPath);
       }
       res.status(404).send('Frontend build not found');
     });
   } else {
     // Redirect non-API, non-health requests to the external Next server
     const target = (config.frontend?.url || 'http://localhost:3000').replace(/\/+$/, '');
     console.log(`↪️  Forwarding frontend routes to ${target} (SERVE_STATIC_FRONTEND=false)`);

     app.get('*', (req, res, next) => {
       if (req.path.startsWith('/api/') ||
           req.path.startsWith('/health') ||
           req.path.includes('.')) {
         return next();
       }
       const redirectUrl = `${target}${req.originalUrl}`;
       return res.redirect(302, redirectUrl);
     });
   }
 }

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API Not Found',
    message: `API route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for other non-handled routes
app.use('*', (req, res) => {
  if (config.nodeEnv === 'production') {
    // In production, redirect unmatched routes to home
    res.redirect('/');
  } else {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Cultural Arbitrage ${config.nodeEnv === 'production' ? 'Production' : 'API'} server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  if (config.nodeEnv === 'production') {
    console.log(`🌐 Frontend: http://localhost:${PORT}/`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
  }
  
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