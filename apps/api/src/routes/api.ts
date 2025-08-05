import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { expandRoutes } from './expand';
import { tasteRoutes } from './taste';
import { assetsRoutes } from './assets';
import { searchRoutes } from './search';
import { simulateRoutes } from './simulate';

const router = Router();

// Mount route modules
router.use('/expand', expandRoutes);
router.use('/taste', tasteRoutes);
router.use('/assets', assetsRoutes);
router.use('/search', searchRoutes);
router.use('/simulate', simulateRoutes);

// API version info and documentation
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    message: 'Cultural Arbitrage Signal Engine API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      // Core Pipeline Endpoints
      expand: {
        path: '/api/expand',
        method: 'POST',
        description: 'Expand cultural themes using LLM analysis',
        endpoints: {
          main: 'POST /api/expand',
          culturalAnalysis: 'POST /api/expand/cultural-analysis',
          health: 'GET /api/expand/health',
        },
      },
      taste: {
        path: '/api/taste',
        method: 'POST',
        description: 'Get taste correlations using Qloo AI',
        endpoints: {
          main: 'POST /api/taste',
          influencers: 'POST /api/taste/influencers',
          brands: 'POST /api/taste/brands',
          health: 'GET /api/taste/health',
        },
      },
      assets: {
        path: '/api/assets',
        method: 'POST',
        description: 'Discover crypto/NFT assets across multiple sources',
        endpoints: {
          main: 'POST /api/assets',
          tokens: 'POST /api/assets/tokens',
          nfts: 'POST /api/assets/nfts',
          trending: 'GET /api/assets/trending',
          health: 'GET /api/assets/health',
        },
      },
      search: {
        path: '/api/search',
        method: 'POST',
        description: 'Full pipeline cultural arbitrage analysis',
        endpoints: {
          main: 'POST /api/search',
          quick: 'POST /api/search/quick',
          status: 'GET /api/search/status/:id',
          health: 'GET /api/search/health',
        },
      },
      simulate: {
        path: '/api/simulate',
        method: 'POST',
        description: 'Portfolio simulation based on cultural arbitrage signals',
        endpoints: {
          main: 'POST /api/simulate',
          backtest: 'POST /api/simulate/backtest',
          health: 'GET /api/simulate/health',
        },
      },
      // System Endpoints
      health: 'GET /health',
      api: 'GET /api',
    },
    services: {
      gpt: 'OpenAI/Claude integration for theme expansion',
      qloo: 'Qloo Taste AI for cultural correlations',
      coingecko: 'CoinGecko for token data and market metrics',
      opensea: 'OpenSea for NFT collection and asset data',
      social: 'Twitter/X and Farcaster integration',
      orchestration: 'Coordinates all services in the pipeline',
      cache: 'In-memory caching with TTL',
    },
    pipeline: [
      '1. Theme Expansion (LLM) - /api/expand',
      '2. Taste Correlations (Qloo) - /api/taste',
      '3. Asset Discovery (CoinGecko + OpenSea) - /api/assets',
      '4. Social Analysis (Twitter + Farcaster) - integrated',
      '5. Full Pipeline (Orchestration) - /api/search',
      '6. Portfolio Simulation - /api/simulate',
    ],
    features: [
      'AI-powered cultural theme expansion',
      'Multi-source asset discovery',
      'Social sentiment analysis',
      'Portfolio optimization',
      'Risk assessment and scoring',
      'Caching and rate limiting',
      'Comprehensive error handling',
    ],
  });
}));

// Legacy endpoints for backward compatibility
router.get('/trends', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    message: 'This endpoint has been replaced. Use POST /api/search for trend analysis.',
    redirectTo: '/api/search',
    method: 'POST',
    timestamp: new Date().toISOString(),
  });
}));

router.get('/signals', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    message: 'This endpoint has been replaced. Use POST /api/search for signal generation.',
    redirectTo: '/api/search',
    method: 'POST',
    timestamp: new Date().toISOString(),
  });
}));

router.get('/analytics', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    message: 'Analytics endpoint - Coming soon',
    description: 'Will provide system analytics and usage statistics',
    plannedFeatures: [
      'API usage metrics',
      'Popular cultural themes',
      'Asset performance tracking',
      'User engagement analytics',
    ],
    timestamp: new Date().toISOString(),
  });
}));

// System status endpoint
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const status = {
    api: 'operational',
    services: {
      gptService: 'operational',
      qlooService: 'operational',
      coingeckoService: 'operational',
      openseaService: 'operational',
      socialService: 'operational',
      orchestrationService: 'operational',
      cacheService: 'operational',
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
  };

  res.json({
    data: status,
    message: 'System status retrieved successfully',
    timestamp: new Date().toISOString(),
  });
}));

export { router as apiRoutes };