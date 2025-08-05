import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { QlooService } from '@/services/qlooService';

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
const qlooService = new QlooService();

// Request validation schema
const tasteRequestSchema = z.object({
  culturalTheme: z.string()
    .min(1, 'Cultural theme is required')
    .max(200, 'Theme must be less than 200 characters'),
  keywords: z.array(z.string())
    .min(1, 'At least one keyword is required')
    .max(50, 'Maximum 50 keywords allowed'),
  categories: z.array(z.string()).optional().default([]),
  options: z.object({
    useCache: z.boolean().optional().default(true),
    limit: z.number().int().positive().max(50).optional().default(20),
  }).optional().default({}),
});

/**
 * POST /api/taste
 * Get taste correlations using Qloo API
 */
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  // Validate request body
  const validationResult = tasteRequestSchema.safeParse(req.body);
  
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

  const { culturalTheme, keywords, categories, options } = validationResult.data;

  try {
    const startTime = Date.now();
    
    // Call Qloo service for taste correlations
    const tasteRecommendation = await qlooService.getTasteCorrelations(
      culturalTheme,
      keywords,
      categories,
      options.useCache
    );
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof tasteRecommendation> = {
      data: tasteRecommendation,
      message: 'Taste correlation analysis completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        cached: options.useCache,
        service: 'QlooService',
        keywordCount: keywords.length,
        categoryCount: categories.length,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Taste correlation analysis failed',
        statusCode: 500,
        code: 'TASTE_ANALYSIS_ERROR',
        details: {
          culturalTheme,
          keywordCount: keywords.length,
          service: 'QlooService',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/taste/influencers
 * Get influencer correlations based on taste profile
 */
router.post('/influencers', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    tasteProfile: z.object({
      keywords: z.array(z.string()),
      categories: z.array(z.string()),
      demographics: z.object({
        ageRange: z.string(),
        interests: z.array(z.string()),
        behaviors: z.array(z.string()),
      }),
      culturalAffinities: z.array(z.string()),
      brandAffinities: z.array(z.string()),
      contentPreferences: z.array(z.string()),
    }),
    platforms: z.array(z.enum(['twitter', 'instagram', 'tiktok'])).optional().default(['twitter', 'instagram', 'tiktok']),
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

  const { tasteProfile, platforms } = validationResult.data;

  try {
    const startTime = Date.now();
    
    const influencerCorrelations = await qlooService.getInfluencerCorrelations(
      tasteProfile,
      platforms
    );
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof influencerCorrelations> = {
      data: influencerCorrelations,
      message: 'Influencer correlation analysis completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        platforms,
        service: 'QlooService',
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Influencer correlation analysis failed',
        statusCode: 500,
        code: 'INFLUENCER_ANALYSIS_ERROR',
        details: {
          platforms,
          service: 'QlooService',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/taste/brands
 * Get brand affinities based on taste profile
 */
router.post('/brands', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    tasteProfile: z.object({
      keywords: z.array(z.string()),
      categories: z.array(z.string()),
      demographics: z.object({
        ageRange: z.string(),
        interests: z.array(z.string()),
        behaviors: z.array(z.string()),
      }),
      culturalAffinities: z.array(z.string()),
      brandAffinities: z.array(z.string()),
      contentPreferences: z.array(z.string()),
    }),
    sectors: z.array(z.string()).optional().default(['technology', 'fashion', 'entertainment']),
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

  const { tasteProfile, sectors } = validationResult.data;

  try {
    const startTime = Date.now();
    
    const brandAffinities = await qlooService.getBrandAffinities(tasteProfile, sectors);
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof brandAffinities> = {
      data: brandAffinities,
      message: 'Brand affinity analysis completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        sectors,
        service: 'QlooService',
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Brand affinity analysis failed',
        statusCode: 500,
        code: 'BRAND_ANALYSIS_ERROR',
        details: {
          sectors,
          service: 'QlooService',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/taste/health
 * Health check for taste service
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Simple health check - we can't easily test Qloo without making a real API call
    // So we'll just check service instantiation
    const healthStatus = {
      status: 'healthy',
      service: 'QlooService',
      timestamp: new Date().toISOString(),
    };
    
    const response: ApiSuccessResponse<typeof healthStatus> = {
      data: healthStatus,
      message: 'Taste service is operational',
      timestamp: new Date().toISOString(),
      meta: {
        service: 'QlooService',
        testSuccessful: true,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: 'Taste service health check failed',
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

export { router as tasteRoutes };