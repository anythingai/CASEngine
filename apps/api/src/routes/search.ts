import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { OrchestrationService } from '@/services/orchestrationService';

// Local response types
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
const orchestrationService = new OrchestrationService();

// Request validation schema
const searchRequestSchema = z.object({
  vibe: z.string()
    .min(1, 'Vibe/theme is required')
    .max(500, 'Vibe must be less than 500 characters')
    .describe('Cultural vibe or theme to analyze'),
  options: z.object({
    useCache: z.boolean().optional().default(true),
    maxAssets: z.number().int().positive().max(50).optional().default(20),
    includeNFTs: z.boolean().optional().default(true),
    includeTokens: z.boolean().optional().default(true),
    riskTolerance: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    timeHorizon: z.enum(['short', 'medium', 'long']).optional().default('medium'),
    minConfidence: z.number().min(0).max(1).optional().default(0.3),
    enableParallelProcessing: z.boolean().optional().default(true),
  }).optional().default({}),
});

/**
 * POST /api/search
 * Full pipeline cultural arbitrage analysis
 */
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  // Validate request body
  const validationResult = searchRequestSchema.safeParse(req.body);
  
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

  const { vibe, options } = validationResult.data;

  try {
    const startTime = Date.now();
    
    // Process full pipeline through orchestration service
    const trendResult = await orchestrationService.processFullPipeline(vibe, options);
    
    const totalProcessingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof trendResult> = {
      data: trendResult,
      message: 'Cultural arbitrage analysis completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        totalProcessingTime,
        originalVibe: vibe,
        pipelineSteps: trendResult.metadata.pipeline,
        assetCount: trendResult.assetMatches.length,
        overallScore: trendResult.overallScore,
        confidence: trendResult.confidence,
        services: [
          'GPTService',
          'QlooService', 
          'CoinGeckoService',
          'OpenSeaService',
          'SocialService',
          'OrchestrationService'
        ],
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Cultural arbitrage analysis failed',
        statusCode: 500,
        code: 'PIPELINE_ERROR',
        details: {
          vibe,
          options,
          stage: 'orchestration',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/search/quick
 * Simplified quick search with fewer features
 */
router.post('/quick', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    vibe: z.string().min(1).max(200),
    assetType: z.enum(['tokens', 'nfts', 'both']).optional().default('both'),
    limit: z.number().int().positive().max(10).optional().default(5),
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

  const { vibe, assetType, limit } = validationResult.data;

  try {
    const startTime = Date.now();
    
    // Quick search with minimal options
    const quickOptions = {
      useCache: true,
      maxAssets: limit,
      includeNFTs: assetType === 'nfts' || assetType === 'both',
      includeTokens: assetType === 'tokens' || assetType === 'both',
      riskTolerance: 'medium' as const,
      timeHorizon: 'medium' as const,
      minConfidence: 0.2,
      enableParallelProcessing: true,
    };
    
    const trendResult = await orchestrationService.processFullPipeline(vibe, quickOptions);
    
    // Return simplified response
    const quickResponse = {
      vibe,
      assets: trendResult.assetMatches.slice(0, limit),
      score: trendResult.overallScore,
      confidence: trendResult.confidence,
      summary: trendResult.recommendations.summary,
      processingTime: trendResult.processing.totalTime,
    };

    const response: ApiSuccessResponse<typeof quickResponse> = {
      data: quickResponse,
      message: 'Quick cultural arbitrage search completed',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime: Date.now() - startTime,
        mode: 'quick',
        assetType,
        limit,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Quick search failed',
        statusCode: 500,
        code: 'QUICK_SEARCH_ERROR',
        details: { vibe, assetType, limit },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/search/status/:id
 * Check status of long-running search (placeholder for future async processing)
 */
router.get('/status/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // This would connect to a job queue system in production
  const response: ApiSuccessResponse<{
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    estimatedCompletion?: string;
    result?: any;
  }> = {
    data: {
      id: id!,
      status: 'completed', // Mock response
      progress: 100,
      result: {
        message: 'Async processing not yet implemented',
        note: 'All searches currently run synchronously',
      },
    },
    message: 'Search status retrieved',
    timestamp: new Date().toISOString(),
    meta: {
      async: false,
      implementation: 'placeholder',
    },
  };

  return res.status(200).json(response);
}));

/**
 * GET /api/search/health
 * Health check for search/orchestration service
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Test basic orchestration functionality with minimal input
    const testResult = await orchestrationService.processFullPipeline('test', {
      useCache: true,
      maxAssets: 1,
      includeNFTs: false,
      includeTokens: true,
      minConfidence: 0.1,
    });

    const isHealthy = testResult.assetMatches !== undefined && 
                     testResult.processing.errors.length === 0;

    const response: ApiSuccessResponse<{
      status: string;
      orchestrationService: string;
      testResult: {
        successful: boolean;
        processingTime: number;
        errors: string[];
      };
    }> = {
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        orchestrationService: 'operational',
        testResult: {
          successful: isHealthy,
          processingTime: testResult.processing.totalTime,
          errors: testResult.processing.errors,
        },
      },
      message: 'Search service health check completed',
      timestamp: new Date().toISOString(),
      meta: {
        testPerformed: true,
        allServicesHealthy: isHealthy,
      },
    };

    return res.status(isHealthy ? 200 : 503).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: 'Search service health check failed',
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'OrchestrationService',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(503).json(errorResponse);
  }
}));

export { router as searchRoutes };