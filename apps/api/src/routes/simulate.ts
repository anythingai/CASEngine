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

// Portfolio simulation types
interface PortfolioAsset {
  id: string;
  type: 'token' | 'nft_collection';
  allocation: number; // Percentage (0-100)
  entryPrice?: number;
  quantity?: number;
}

interface SimulationResult {
  portfolio: {
    assets: PortfolioAsset[];
    totalAllocation: number;
    riskScore: number;
    diversificationScore: number;
  };
  projections: {
    timeframe: string;
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  riskMetrics: {
    var95: number; // Value at Risk
    correlationMatrix: number[][];
    sectorExposure: Record<string, number>;
    liquidityScore: number;
  };
  recommendations: {
    rebalancing: string[];
    riskMitigation: string[];
    opportunities: string[];
  };
}

// Request validation schema
const simulateRequestSchema = z.object({
  // Accept missing or empty vibe and default in production; trim whitespace
  vibe: z.preprocess(
    (v) => {
      if (typeof v === 'string') {
        const t = v.trim();
        return t.length === 0 ? undefined : t;
      }
      return v;
    },
    z.string()
      .min(1, 'Vibe/theme is required')
      .max(200, 'Vibe must be less than 200 characters')
  ).optional().default('trend'),
  // Coerce numbers from strings
  portfolioSize: z.coerce.number()
    .positive('Portfolio size must be positive')
    .max(1000000, 'Portfolio size too large')
    .describe('Portfolio size in USD'),
  // Normalize case for enums
  riskTolerance: z.preprocess(
    (s) => typeof s === 'string' ? s.toLowerCase() : s,
    z.enum(['conservative', 'moderate', 'aggressive']).optional().default('moderate')
  ),
  timeHorizon: z.preprocess(
    (s) => typeof s === 'string' ? s.toLowerCase() : s,
    z.enum(['1m', '3m', '6m', '1y', '2y']).optional().default('6m')
  ),
  options: z.object({
    maxAssets: z.coerce.number().int().positive().max(20).optional().default(10),
    includeNFTs: z.coerce.boolean().optional().default(true),
    includeTokens: z.coerce.boolean().optional().default(true),
    rebalanceFrequency: z.preprocess(
      (s) => typeof s === 'string' ? s.toLowerCase() : s,
      z.enum(['never', 'monthly', 'quarterly']).optional().default('quarterly')
    ),
    useCache: z.coerce.boolean().optional().default(true),
  }).optional().default({}),
});

/**
 * POST /api/simulate
 * Simulate portfolio performance based on cultural arbitrage signals
 */
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  // Robust body handling for production proxies
  let rawBody: unknown = req.body;
  if (typeof rawBody === 'string') {
    try {
      rawBody = JSON.parse(rawBody);
    } catch {
      // leave as-is; zod will handle failure
    }
  }

  // First-pass strict validation
  let parsed = simulateRequestSchema.safeParse(rawBody);
  let payload: z.infer<typeof simulateRequestSchema>;

  if (!parsed.success) {
    // Diagnostics for deployment
    const contentType = req.headers['content-type'];
    const safeBodySample = (() => {
      try { return JSON.stringify(rawBody).slice(0, 500); } catch { return 'unserializable'; }
    })();
    const bodyKeys = rawBody && typeof rawBody === 'object' ? Object.keys(rawBody as Record<string, unknown>) : typeof rawBody;

    console.warn('[Simulate] Validation failed', {
      contentType,
      bodyKeys,
      bodySample: safeBodySample,
      details: parsed.error.flatten(),
    });

    // Relaxed salvage: coerce common fields and supply defaults
    const relaxedSchema = z.object({
      vibe: z.preprocess(v => typeof v === 'string' ? v.trim() : v, z.string().min(1)).optional(),
      portfolioSize: z.coerce.number().positive().max(1000000).optional(),
      riskTolerance: z.preprocess(s => typeof s === 'string' ? s.toLowerCase() : s, z.enum(['conservative', 'moderate', 'aggressive']).optional()),
      timeHorizon: z.preprocess(s => typeof s === 'string' ? s.toLowerCase() : s, z.enum(['1m', '3m', '6m', '1y', '2y']).optional()),
      options: z.any().optional(),
    });

    const relaxed = relaxedSchema.safeParse(rawBody);
    if (relaxed.success) {
      const relaxedOptions = typeof relaxed.data.options === 'object' && relaxed.data.options
        ? relaxed.data.options as Record<string, unknown>
        : {};

      const assembled = {
        vibe: relaxed.data.vibe ?? 'trend',
        portfolioSize: relaxed.data.portfolioSize ?? 10000,
        riskTolerance: relaxed.data.riskTolerance ?? 'moderate',
        timeHorizon: relaxed.data.timeHorizon ?? '6m',
        options: {
          maxAssets: typeof relaxedOptions['maxAssets'] !== 'undefined' ? Number(relaxedOptions['maxAssets']) : 10,
          includeNFTs: typeof relaxedOptions['includeNFTs'] !== 'undefined' ? Boolean(relaxedOptions['includeNFTs']) : true,
          includeTokens: typeof relaxedOptions['includeTokens'] !== 'undefined' ? Boolean(relaxedOptions['includeTokens']) : true,
          rebalanceFrequency: (() => {
            const rf = String(relaxedOptions['rebalanceFrequency'] ?? 'quarterly').toLowerCase();
            return (['never','monthly','quarterly'] as const).includes(rf as any) ? rf as 'never'|'monthly'|'quarterly' : 'quarterly';
          })(),
          useCache: typeof relaxedOptions['useCache'] !== 'undefined' ? Boolean(relaxedOptions['useCache']) : true,
        }
      };

      const revalidate = simulateRequestSchema.safeParse(assembled);
      if (revalidate.success) {
        payload = revalidate.data;
        console.log('[Simulate] Recovered request via relaxed parse');
      } else {
        const response: ApiErrorResponse = {
          error: {
            message: 'Invalid request data',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            details: revalidate.error.flatten(),
          },
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }
    } else {
      const response: ApiErrorResponse = {
        error: {
          message: 'Invalid request data',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }
  } else {
    payload = parsed.data;
  }

  const { vibe, portfolioSize, riskTolerance, timeHorizon, options } = payload;

  // Deployment diagnostics: confirm accepted payload shape (no PII)
  console.log('[Simulate] Request accepted', {
    vibeLength: (vibe || '').length,
    portfolioSize,
    riskTolerance,
    timeHorizon,
    options: {
      maxAssets: options?.maxAssets,
      includeNFTs: options?.includeNFTs,
      includeTokens: options?.includeTokens,
      rebalanceFrequency: options?.rebalanceFrequency,
      useCache: options?.useCache,
    }
  });

  try {
    const startTime = Date.now();
    
    // First, get the cultural arbitrage analysis
    const trendResult = await orchestrationService.processFullPipeline(vibe, {
      useCache: options.useCache,
      maxAssets: options.maxAssets,
      includeNFTs: options.includeNFTs,
      includeTokens: options.includeTokens,
      riskTolerance: riskTolerance === 'conservative' ? 'low' : 
                     riskTolerance === 'aggressive' ? 'high' : 'medium',
      timeHorizon: timeHorizon.includes('m') ? 'short' : 
                   timeHorizon === '1y' ? 'medium' : 'long',
      minConfidence: riskTolerance === 'conservative' ? 0.6 : 
                     riskTolerance === 'aggressive' ? 0.2 : 0.4,
    });

    // Generate portfolio simulation
    const simulation = generatePortfolioSimulation(
      trendResult.assetMatches,
      portfolioSize,
      riskTolerance,
      timeHorizon
    );

    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<{
      analysis: typeof trendResult;
      simulation: typeof simulation;
      metadata: {
        vibe: string;
        portfolioSize: number;
        riskTolerance: string;
        timeHorizon: string;
      };
    }> = {
      data: {
        analysis: trendResult,
        simulation,
        metadata: {
          vibe,
          portfolioSize,
          riskTolerance,
          timeHorizon,
        },
      },
      message: 'Portfolio simulation completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        assetCount: trendResult.assetMatches.length,
        portfolioAssets: simulation.portfolio.assets.length,
        totalRisk: simulation.portfolio.riskScore,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Portfolio simulation failed',
        statusCode: 500,
        code: 'SIMULATION_ERROR',
        details: {
          vibe,
          portfolioSize,
          riskTolerance,
          timeHorizon,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/simulate/backtest
 * Backtest a portfolio strategy (simplified version)
 */
router.post('/backtest', asyncHandler(async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    assets: z.array(z.object({
      id: z.string(),
      type: z.enum(['token', 'nft_collection']),
      allocation: z.number().min(0).max(100),
    })).min(1).max(10),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    initialValue: z.number().positive().max(1000000),
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

  const { assets, startDate, endDate, initialValue } = validationResult.data;

  try {
    const startTime = Date.now();
    
    // Generate mock backtest results
    const backtestResult = generateBacktestResults(assets, startDate, endDate, initialValue);
    
    const processingTime = Date.now() - startTime;

    const response: ApiSuccessResponse<typeof backtestResult> = {
      data: backtestResult,
      message: 'Backtest completed successfully',
      timestamp: new Date().toISOString(),
      meta: {
        processingTime,
        assetCount: assets.length,
        period: `${startDate} to ${endDate}`,
        initialValue,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Backtest failed',
        statusCode: 500,
        code: 'BACKTEST_ERROR',
        details: { assets, startDate, endDate, initialValue },
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/simulate/health
 * Health check for simulation service
 */
router.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Simple health check
    const healthStatus = {
      status: 'healthy',
      service: 'SimulationService',
      features: {
        portfolioSimulation: true,
        backtesting: true,
        riskAnalysis: true,
      },
    };
    
    const response: ApiSuccessResponse<typeof healthStatus> = {
      data: healthStatus,
      message: 'Simulation service is operational',
      timestamp: new Date().toISOString(),
      meta: {
        service: 'SimulationService',
        testSuccessful: true,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: 'Simulation service health check failed',
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

// Helper function to generate portfolio simulation
function generatePortfolioSimulation(
  assets: any[],
  portfolioSize: number,
  riskTolerance: string,
  timeHorizon: string
): SimulationResult {
  // Filter and select assets based on risk tolerance
  const selectedAssets = assets
    .filter(asset => {
      if (riskTolerance === 'conservative') {
        return asset.marketMetrics.riskLevel === 'low' || asset.marketMetrics.riskLevel === 'medium';
      } else if (riskTolerance === 'aggressive') {
        return true; // Include all risk levels
      } else {
        return asset.marketMetrics.riskLevel !== 'extreme';
      }
    })
    .slice(0, riskTolerance === 'conservative' ? 5 : riskTolerance === 'aggressive' ? 10 : 8);

  // Allocate portfolio based on relevance scores and risk
  const totalScore = selectedAssets.reduce((sum, asset) => sum + asset.relevanceScore, 0);
  
  const portfolioAssets: PortfolioAsset[] = selectedAssets.map(asset => {
    let baseAllocation = (asset.relevanceScore / totalScore) * 100;
    
    // Adjust allocation based on risk tolerance
    if (riskTolerance === 'conservative') {
      baseAllocation = Math.min(baseAllocation, 20); // Max 20% per asset
    } else if (riskTolerance === 'aggressive') {
      baseAllocation = Math.min(baseAllocation, 40); // Max 40% per asset
    } else {
      baseAllocation = Math.min(baseAllocation, 30); // Max 30% per asset
    }

    return {
      id: asset.id,
      type: asset.type,
      allocation: Math.round(baseAllocation * 100) / 100,
      entryPrice: asset.currentPrice || asset.floorPrice,
      quantity: asset.currentPrice ? portfolioSize * (baseAllocation / 100) / asset.currentPrice : 0,
    };
  });

  // Normalize allocations to 100%
  const totalAllocation = portfolioAssets.reduce((sum, asset) => sum + asset.allocation, 0);
  portfolioAssets.forEach(asset => {
    asset.allocation = Math.round((asset.allocation / totalAllocation) * 10000) / 100;
  });

  // Calculate risk metrics
  const avgRiskScore = selectedAssets.reduce((sum, asset) => {
    const riskValue = asset.marketMetrics.riskLevel === 'low' ? 25 :
                     asset.marketMetrics.riskLevel === 'medium' ? 50 :
                     asset.marketMetrics.riskLevel === 'high' ? 75 : 100;
    return sum + riskValue;
  }, 0) / selectedAssets.length;

  const diversificationScore = Math.min(100, selectedAssets.length * 10); // 10 points per asset, max 100

  // Generate projections based on time horizon and risk
  const riskMultiplier = riskTolerance === 'conservative' ? 0.7 :
                        riskTolerance === 'aggressive' ? 1.5 : 1.0;
  
  const timeMultiplier = timeHorizon.includes('m') ? 0.5 :
                        timeHorizon === '1y' ? 1.0 : 1.5;

  const expectedReturn = (15 + (avgRiskScore * 0.3)) * riskMultiplier * timeMultiplier; // Base 15% + risk premium
  const volatility = (20 + (avgRiskScore * 0.4)) * riskMultiplier; // Base 20% + risk-based volatility

  return {
    portfolio: {
      assets: portfolioAssets,
      totalAllocation: 100,
      riskScore: Math.round(avgRiskScore),
      diversificationScore: Math.round(diversificationScore),
    },
    projections: {
      timeframe: timeHorizon,
      expectedReturn: Math.round(expectedReturn * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      sharpeRatio: Math.round((expectedReturn / volatility) * 100) / 100,
      maxDrawdown: Math.round((volatility * 0.8) * 100) / 100, // Estimated max drawdown
    },
    riskMetrics: {
      var95: Math.round((portfolioSize * 0.05) * 100) / 100, // 5% VaR approximation
      correlationMatrix: generateMockCorrelationMatrix(selectedAssets.length),
      sectorExposure: generateSectorExposure(selectedAssets, portfolioAssets),
      liquidityScore: Math.round(selectedAssets.reduce((sum, asset) => 
        sum + (asset.marketMetrics.liquidityScore || 50), 0) / selectedAssets.length),
    },
    recommendations: {
      rebalancing: generateRebalancingRecommendations(portfolioAssets, riskTolerance),
      riskMitigation: generateRiskMitigationRecommendations(avgRiskScore, diversificationScore),
      opportunities: generateOpportunityRecommendations(selectedAssets, timeHorizon),
    },
  };
}

// Helper function to generate backtest results
function generateBacktestResults(
  assets: any[],
  startDate: string,
  endDate: string,
  initialValue: number
) {
  // Mock backtest data generation
  const days = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const dailyReturns = [];
  let currentValue = initialValue;
  
  for (let i = 0; i < days; i++) {
    const dailyReturn = (Math.random() - 0.45) * 0.05; // Slightly positive bias
    currentValue *= (1 + dailyReturn);
    
    dailyReturns.push({
      date: new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.round(currentValue * 100) / 100,
      return: Math.round(dailyReturn * 10000) / 100, // Percentage
    });
  }

  const finalValue = currentValue;
  const totalReturn = ((finalValue - initialValue) / initialValue) * 100;
  const volatility = Math.sqrt(dailyReturns.reduce((sum, day) => sum + Math.pow(day.return, 2), 0) / days) * Math.sqrt(252);

  return {
    summary: {
      startDate,
      endDate,
      initialValue,
      finalValue: Math.round(finalValue * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      annualizedReturn: Math.round((Math.pow(finalValue / initialValue, 365 / days) - 1) * 10000) / 100,
      volatility: Math.round(volatility * 100) / 100,
      sharpeRatio: Math.round((totalReturn / volatility) * 100) / 100,
    },
    timeSeries: dailyReturns,
    assetPerformance: assets.map(asset => ({
      id: asset.id,
      type: asset.type,
      allocation: asset.allocation,
      return: Math.round((Math.random() * 60 - 20) * 100) / 100, // Random return between -20% and +40%
    })),
  };
}

// Helper functions for generating mock data
function generateMockCorrelationMatrix(size: number): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      if (i === j) {
        matrix[i]![j] = 1.0;
      } else {
        matrix[i]![j] = Math.round((Math.random() * 0.6 + 0.2) * 100) / 100; // 0.2 to 0.8 correlation
      }
    }
  }
  return matrix;
}

function generateSectorExposure(assets: any[], portfolioAssets: PortfolioAsset[]): Record<string, number> {
  const sectors: Record<string, number> = {};
  
  portfolioAssets.forEach(portfolioAsset => {
    const asset = assets.find(a => a.id === portfolioAsset.id);
    const sector = asset?.type === 'token' ? 'DeFi' : 'NFT';
    sectors[sector] = (sectors[sector] || 0) + portfolioAsset.allocation;
  });

  return sectors;
}

function generateRebalancingRecommendations(portfolioAssets: PortfolioAsset[], riskTolerance: string): string[] {
  const recommendations = [];
  
  if (portfolioAssets.some(asset => asset.allocation > 35)) {
    recommendations.push('Consider reducing concentration in high-allocation assets');
  }
  
  if (riskTolerance === 'conservative' && portfolioAssets.length < 5) {
    recommendations.push('Increase diversification by adding more assets');
  }
  
  recommendations.push('Review allocations monthly and rebalance quarterly');
  
  return recommendations;
}

function generateRiskMitigationRecommendations(riskScore: number, diversificationScore: number): string[] {
  const recommendations = [];
  
  if (riskScore > 70) {
    recommendations.push('Portfolio has high risk - consider adding stable assets');
    recommendations.push('Set stop-loss orders at 15-20% below entry prices');
  }
  
  if (diversificationScore < 50) {
    recommendations.push('Improve diversification across different asset types and sectors');
  }
  
  recommendations.push('Monitor market correlation during volatile periods');
  recommendations.push('Consider hedging strategies during uncertain market conditions');
  
  return recommendations;
}

function generateOpportunityRecommendations(assets: any[], timeHorizon: string): string[] {
  const recommendations = [];
  
  const highMomentumAssets = assets.filter(a => a.marketMetrics.momentumScore > 60);
  if (highMomentumAssets.length > 0) {
    recommendations.push(`Monitor high-momentum assets: ${highMomentumAssets.slice(0, 3).map(a => a.name).join(', ')}`);
  }
  
  if (timeHorizon.includes('m')) {
    recommendations.push('Focus on assets with strong social media momentum for short-term gains');
  } else {
    recommendations.push('Look for undervalued assets with strong cultural narratives for long-term growth');
  }
  
  recommendations.push('Watch for new cultural trends that could drive future opportunities');
  
  return recommendations;
}

export { router as simulateRoutes };