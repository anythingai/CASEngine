import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { CoinGeckoService } from '@/services/coingeckoService';
import { OpenSeaService } from '@/services/openseaService';
import { SocialService } from '@/services/socialService';
// Local response types to avoid import issues
interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

interface ApiErrorResponse {
  error: {
    message: string;
    statusCode: number;
    code?: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

const router = Router();
const coingeckoService = new CoinGeckoService();
const openseaService = new OpenSeaService();
const socialService = new SocialService();

// Request validation schema
const assetsRequestSchema = z.object({
  keywords: z.array(z.string())
    .min(1, 'At least one keyword is required')
    .max(20, 'Maximum 20 keywords allowed'),
  categories: z.array(z.string()).optional().default([]),
  assetTypes: z.array(z.enum(['tokens', 'nfts', 'both'])).optional().default(['both']),
  options: z.object({
    useCache: z.boolean().optional().default(true),
    limit: z.number().int().positive().max(50).optional().default(20),
    includeMarketData: z.boolean().optional().default(true),
    includeSocialData: z.boolean().optional().default(true),
    minRelevanceScore: z.number().min(0).max(100).optional().default(20),
  }).optional().default({}),
});


/**
 * POST /api/assets
 * Discover relevant crypto/NFT assets across multiple sources
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate request body
  const validationResult = assetsRequestSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    const response: ApiErrorResponse = {
      error: {
        message: 'Invalid request data',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten(),
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  const { keywords, categories, assetTypes, options } = validationResult.data;

  try {
    const startTime = Date.now();
    const includeTokens = assetTypes.includes('tokens') || assetTypes.includes('both');
    const includeNFTs = assetTypes.includes('nfts') || assetTypes.includes('both');

    // Discover assets in parallel
    const assetPromises: Promise<any>[] = [];
    
    if (includeTokens) {
      assetPromises.push(
        coingeckoService.findRelevantTokens(keywords, Math.ceil(options.limit / 2))
      );
    }
    
    if (includeNFTs) {
      assetPromises.push(
        openseaService.findRelevantNFTs(keywords, Math.ceil(options.limit / 2))
      );
    }

    // Get social analysis for context if requested
    let socialAnalysis = null;
    if (options.includeSocialData && keywords.length > 0) {
      assetPromises.push(
        socialService.analyzeSocialTrend(keywords[0]!) // Analyze primary keyword
      );
    }

    const results = await Promise.allSettled(assetPromises);
    
    // Process results
    let tokenAssets: any[] = [];
    let nftAssets: any[] = [];
    
    let resultIndex = 0;
    
    if (includeTokens) {
      const tokenResult = results[resultIndex++];
      if (tokenResult?.status === 'fulfilled') {
        tokenAssets = tokenResult.value.filter((asset: any) =>
          asset.relevanceScore >= options.minRelevanceScore
        );
      }
    }
    
    if (includeNFTs) {
      const nftResult = results[resultIndex++];
      if (nftResult?.status === 'fulfilled') {
        nftAssets = nftResult.value.filter((asset: any) =>
          asset.relevanceScore >= options.minRelevanceScore
        );
      }
    }
    
    if (options.includeSocialData && results[resultIndex]) {
      const socialResult = results[resultIndex];
      if (socialResult?.status === 'fulfilled') {
        socialAnalysis = socialResult.value;
      }
    }

    // Combine and sort assets
    const combinedAssets = [
      ...tokenAssets.map((asset: any) => ({
        ...asset,
        type: 'token' as const,
        source: 'coingecko',
      })),
      ...nftAssets.map((asset: any) => ({
        ...asset,
        type: 'nft_collection' as const,
        source: 'opensea',
      })),
    ].sort((a, b) => b.relevanceScore - a.relevanceScore)
     .slice(0, options.limit);

    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<{
      assets: typeof combinedAssets;
      socialAnalysis: typeof socialAnalysis;
      summary: {
        totalFound: number;
        tokenCount: number;
        nftCount: number;
        averageRelevanceScore: number;
      };
    }> = {
      data: {
        assets: combinedAssets,
        socialAnalysis,
        summary: {
          totalFound: combinedAssets.length,
          tokenCount: tokenAssets.length,
          nftCount: nftAssets.length,
          averageRelevanceScore: combinedAssets.length > 0 
            ? Math.round(combinedAssets.reduce((sum, asset) => sum + asset.relevanceScore, 0) / combinedAssets.length)
            : 0,
        },
      },
      message: 'Asset discovery completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        cached: options.useCache,
        services: ['CoinGeckoService', 'OpenSeaService', ...(options.includeSocialData ? ['SocialService'] : [])],
        keywordCount: keywords.length,
        assetTypes: assetTypes.join(', '),
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Asset discovery failed',
        statusCode: 500,
        code: 'ASSET_DISCOVERY_ERROR',
        details: {
          keywords,
          categories,
          assetTypes,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/assets/tokens
 * Discover crypto tokens specifically
 */
router.post('/tokens', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    keywords: z.array(z.string()).min(1).max(20),
    categories: z.array(z.string()).optional().default([]),
    limit: z.number().int().positive().max(50).optional().default(20),
    useCache: z.boolean().optional().default(true),
  });

  const validationResult = schema.safeParse(req.body);
  
  if (!validationResult.success) {
    const response: ApiErrorResponse = {
      error: {
        message: 'Invalid request data',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten(),
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  const { keywords, categories, limit, useCache } = validationResult.data;

  try {
    const startTime = Date.now();
    
    const tokenMatches = await coingeckoService.findRelevantTokens(keywords, limit);
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof tokenMatches> = {
      data: tokenMatches,
      message: 'Token discovery completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        cached: useCache,
        service: 'CoinGeckoService',
        keywordCount: keywords.length,
        resultCount: tokenMatches.length,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Token discovery failed',
        statusCode: 500,
        code: 'TOKEN_DISCOVERY_ERROR',
        details: { keywords, categories },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/assets/nfts
 * Discover NFT collections specifically
 */
router.post('/nfts', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    keywords: z.array(z.string()).min(1).max(20),
    categories: z.array(z.string()).optional().default([]),
    limit: z.number().int().positive().max(50).optional().default(15),
    useCache: z.boolean().optional().default(true),
  });

  const validationResult = schema.safeParse(req.body);
  
  if (!validationResult.success) {
    const response: ApiErrorResponse = {
      error: {
        message: 'Invalid request data',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten(),
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  const { keywords, categories, limit, useCache } = validationResult.data;

  try {
    const startTime = Date.now();
    
    const nftMatches = await openseaService.findRelevantNFTs(keywords, limit);
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof nftMatches> = {
      data: nftMatches,
      message: 'NFT discovery completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        cached: useCache,
        service: 'OpenSeaService',
        keywordCount: keywords.length,
        resultCount: nftMatches.length,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'NFT discovery failed',
        statusCode: 500,
        code: 'NFT_DISCOVERY_ERROR',
        details: { keywords, categories },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/assets/trending
 * Get trending assets across platforms
 */
router.get('/trending', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
    includeTokens: z.string().optional().transform(val => val !== 'false'),
    includeNFTs: z.string().optional().transform(val => val !== 'false'),
  });

  const validationResult = schema.safeParse(req.query);
  
  if (!validationResult.success) {
    const response: ApiErrorResponse = {
      error: {
        message: 'Invalid query parameters',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten(),
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(400).json(response);
  }

  const { limit, includeTokens, includeNFTs } = validationResult.data;

  try {
    const startTime = Date.now();
    const promises: Promise<any>[] = [];
    
    if (includeTokens) {
      promises.push(coingeckoService.getTrendingTokens());
    }
    
    // Note: OpenSea doesn't have a direct trending endpoint
    // This would need to be implemented based on volume/activity
    
    const results = await Promise.allSettled(promises);
    
    let trendingTokens: any[] = [];
    
    if (includeTokens && results[0] && results[0].status === 'fulfilled') {
      trendingTokens = results[0].value.slice(0, Math.ceil(limit / 2));
    }

    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<{
      tokens: typeof trendingTokens;
      nfts: any[];
      summary: {
        totalCount: number;
        tokenCount: number;
        nftCount: number;
      };
    }> = {
      data: {
        tokens: trendingTokens,
        nfts: [], // Would be implemented with OpenSea trending logic
        summary: {
          totalCount: trendingTokens.length,
          tokenCount: trendingTokens.length,
          nftCount: 0,
        },
      },
      message: 'Trending assets retrieved successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        services: includeTokens ? ['CoinGeckoService'] : [],
        limit,
        includeTokens,
        includeNFTs,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Failed to retrieve trending assets',
        statusCode: 500,
        code: 'TRENDING_ASSETS_ERROR',
        details: { limit, includeTokens, includeNFTs },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/assets/health
 * Health check for asset services
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Test basic functionality of each service
    const healthChecks = await Promise.allSettled([
      coingeckoService.getTrendingTokens().then(() => ({ service: 'CoinGecko', status: 'healthy' })),
      // OpenSea health check would go here
      Promise.resolve({ service: 'OpenSea', status: 'healthy' }), // Placeholder
    ]);

    const services = healthChecks.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { service: 'Unknown', status: 'unhealthy' }
    );

    const allHealthy = services.every(service => service.status === 'healthy');

    const response: ApiSuccessResponse<{
      status: string;
      services: typeof services;
    }> = {
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        services,
      },
      message: 'Asset services health check completed',
      timestamp: new Date().toISOString(),
      meta: {
        servicesChecked: services.length,
        allHealthy,
      },
    };

    return res.status(allHealthy ? 200 : 503).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: 'Asset services health check failed',
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(503).json(errorResponse);
  }
}));

export { router as assetsRoutes };