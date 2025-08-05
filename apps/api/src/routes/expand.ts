import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { GPTService } from '@/services/gptService';

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
const gptService = new GPTService();

// Request validation schema
const expandRequestSchema = z.object({
  theme: z.string()
    .min(1, 'Theme is required')
    .max(500, 'Theme must be less than 500 characters')
    .describe('Cultural theme/vibe to expand'),
  options: z.object({
    useCache: z.boolean().optional().default(true),
    maxTokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).optional().default({}),
});

/**
 * POST /api/expand
 * Expand a cultural theme using LLM analysis
 */
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  // Validate request body
  const validationResult = expandRequestSchema.safeParse(req.body);
  
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

  const { theme, options } = validationResult.data;

  try {
    const startTime = Date.now();
    
    // Call GPT service to expand theme
    const themeExpansion = await gptService.expandTheme(theme, options.useCache);
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof themeExpansion> = {
      data: themeExpansion,
      message: 'Theme expansion completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        cached: options.useCache,
        service: 'GPTService',
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Theme expansion failed',
        statusCode: 500,
        code: 'EXPANSION_ERROR',
        details: {
          theme,
          service: 'GPTService',
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/expand/cultural-analysis
 * Generate cultural analysis for specific keywords
 */
router.post('/cultural-analysis', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    keywords: z.array(z.string()).min(1).max(20),
    context: z.string().optional().default(''),
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

  const { keywords, context } = validationResult.data;

  try {
    const startTime = Date.now();
    
    const analysis = await gptService.generateCulturalAnalysis(keywords, context);
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof analysis> = {
      data: analysis,
      message: 'Cultural analysis completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        keywordCount: keywords.length,
        service: 'GPTService',
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Cultural analysis failed',
        statusCode: 500,
        code: 'ANALYSIS_ERROR',
        details: {
          keywords,
          context,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/expand/health
 * Health check for expansion service
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Simple health check with a minimal expansion
    await gptService.expandTheme('test', false);
    
    const response: ApiSuccessResponse<{ status: string }> = {
      data: { status: 'healthy' },
      message: 'Expansion service is operational',
      timestamp: new Date().toISOString(),
      meta: {
        service: 'GPTService',
        testSuccessful: true,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: 'Expansion service health check failed',
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

export { router as expandRoutes };