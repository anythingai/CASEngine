import {
  SearchRequest,
  SearchResponse,
  ExpandRequest,
  ExpandResponse,
  TasteRequest,
  TasteResponse,
  AssetsRequest,
  AssetsResponse,
  SimulateRequest,
  SimulateResponse,
  HealthResponse,
  AssetRecommendation,
  ActionType
} from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
const REQUEST_TIMEOUT = 60000 // 60 seconds for search operations
const RETRY_ATTEMPTS = 2
const RETRY_DELAY = 1000

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = "APIError"
  }
}

// Progress tracking for long operations
export type ProgressStep = {
  step: number
  totalSteps: number
  message: string
  completed: boolean
}

export type ProgressCallback = (progress: ProgressStep) => void

async function apiRequestWithTimeout<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: controller.signal,
    ...options,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorCode = `HTTP_${response.status}`
      
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error.message || errorData.error
          errorCode = errorData.error.code || errorCode
        }
      } catch {
        // If we can't parse error JSON, use the default message
      }
      
      throw new APIError(errorMessage, response.status, errorCode)
    }

    const data = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIError("Request timed out. Please try again.", 408, "TIMEOUT")
    }
    
    if (error instanceof APIError) {
      throw error
    }
    
    // Network or other errors
    if (error instanceof Error) {
      throw new APIError(`Network error: ${error.message}`, 0, "NETWORK_ERROR")
    }
    
    throw new APIError("An unexpected error occurred", 500, "UNKNOWN_ERROR")
  }
}

async function apiRequestWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries = RETRY_ATTEMPTS
): Promise<T> {
  let lastError: APIError | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequestWithTimeout<T>(endpoint, options)
    } catch (error) {
      lastError = error instanceof APIError ? error : new APIError("Unknown error")
      
      // Don't retry on client errors (4xx) except timeouts
      if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 408) {
        throw lastError
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)))
    }
  }
  
  throw lastError || new APIError("Request failed after retries")
}

// Legacy function for backwards compatibility
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiRequestWithRetry<T>(endpoint, options)
}

// Main search endpoint - Full pipeline
export async function searchVibes(request: SearchRequest): Promise<SearchResponse> {
  // Transform frontend request to backend expected format
  const backendRequest = {
    vibe: request.query,
    options: {
      useCache: true,
      maxAssets: request.options?.maxResults || 20,
      includeNFTs: true,
      includeTokens: true,
      riskTolerance: 'medium' as const,
      timeHorizon: 'medium' as const,
      minConfidence: 0.3,
      enableParallelProcessing: true,
      ...request.options
    }
  }

  const response = await apiRequest<{
    data: any; // TrendResult from backend
    message: string;
    timestamp: string;
    meta?: any;
  }>("/api/search", {
    method: "POST",
    body: JSON.stringify(backendRequest),
  })

  // Transform backend TrendResult to frontend SearchResponse
  return transformTrendResultToSearchResponse(response.data, response.meta)
}

// Transform backend TrendResult to frontend SearchResponse format
function transformTrendResultToSearchResponse(trendResult: any, meta?: any): SearchResponse {
  return {
    query: trendResult.originalVibe,
    themes: trendResult.themeExpansion?.expandedKeywords || [],
    tasteProfile: trendResult.tasteProfile ? {
      primaryCategories: trendResult.themeExpansion?.categories || [],
      sentiment: {
        sentiment: trendResult.themeExpansion?.sentiment || 'neutral',
        confidence: trendResult.confidence || 0.5,
        score: trendResult.themeExpansion?.sentiment === 'positive' ? 0.7 :
               trendResult.themeExpansion?.sentiment === 'negative' ? -0.7 : 0
      },
      riskTolerance: 'medium',
      investmentStyle: 'moderate'
    } : undefined,
    assets: trendResult.assetMatches?.map(transformAssetMatch) || [],
    simulation: trendResult.simulation ? {
      totalValue: 100000,
      totalReturn: 0,
      totalReturnPercent: 0,
      timeframe: '30 days',
      assets: [],
      performance: {}
    } : undefined,
    metadata: {
      processingTime: meta?.totalProcessingTime || trendResult.processing?.totalTime || 0,
      confidence: trendResult.confidence || 0.5,
      timestamp: new Date().toISOString()
    }
  }
}

// Transform backend AssetMatch to frontend AssetRecommendation
function transformAssetMatch(asset: any): AssetRecommendation {
  return {
    symbol: asset.symbol || asset.name,
    name: asset.name,
    type: asset.type === 'token' ? 'token' :
          asset.type === 'nft_collection' ? 'nft_collection' : 'token',
    blockchain: asset.blockchain || 'ethereum',
    contractAddress: asset.contractAddress,
    currentPrice: asset.currentPrice,
    priceChange24h: asset.priceChange24h,
    volume24h: asset.volume24h,
    marketCap: asset.marketCap,
    floorPrice: asset.floorPrice,
    recommendation: {
      action: determineAction(asset),
      confidence: asset.confidence || 0.5,
      reasoning: asset.reasoning || 'AI-generated recommendation based on cultural analysis',
      riskLevel: asset.marketMetrics?.riskLevel || 'medium',
      timeframe: asset.marketMetrics?.timeHorizon || 'medium-term'
    },
    links: asset.links
  }
}

// Determine action based on asset data
function determineAction(asset: any): ActionType {
  const score = asset.relevanceScore || 50
  const confidence = asset.confidence || 0.5
  
  if (confidence > 0.7 && score > 70) return 'buy'
  if (confidence > 0.6 && score > 60) return 'watch'
  if (score < 40) return 'hold'
  return 'watch'
}

// Theme expansion endpoint
export async function expandThemes(request: ExpandRequest): Promise<ExpandResponse> {
  return apiRequest<ExpandResponse>("/api/expand", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Taste correlations endpoint
export async function analyzeTaste(request: TasteRequest): Promise<TasteResponse> {
  return apiRequest<TasteResponse>("/api/taste", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Asset discovery endpoint
export async function discoverAssets(request: AssetsRequest): Promise<AssetsResponse> {
  return apiRequest<AssetsResponse>("/api/assets", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Portfolio simulation endpoint
export async function simulatePortfolio(request: SimulateRequest): Promise<SimulateResponse> {
  return apiRequestWithRetry<SimulateResponse>("/api/simulate", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Enhanced simulation with vibe-based portfolio creation
export async function simulateVibePortfolio(
  vibe: string,
  options: {
    portfolioSize: number
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
    timeHorizon: '1m' | '3m' | '6m' | '1y' | '2y'
    rebalanceFrequency?: 'never' | 'monthly' | 'quarterly'
  }
): Promise<{
  data: {
    analysis: any
    simulation: any
    metadata: any
  }
  message: string
  timestamp: string
  meta?: any
}> {
  const requestBody = {
    vibe,
    portfolioSize: options.portfolioSize,
    riskTolerance: options.riskTolerance,
    timeHorizon: options.timeHorizon,
    options: {
      rebalanceFrequency: options.rebalanceFrequency || 'quarterly',
      useCache: true,
      maxAssets: options.riskTolerance === 'conservative' ? 5 :
                options.riskTolerance === 'aggressive' ? 10 : 8,
      includeNFTs: true,
      includeTokens: true,
    }
  }

  return apiRequestWithRetry<{
    data: {
      analysis: any
      simulation: any
      metadata: any
    }
    message: string
    timestamp: string
    meta?: any
  }>("/api/simulate", {
    method: "POST",
    body: JSON.stringify(requestBody),
  })
}

// Portfolio backtesting endpoint
export async function backtestStrategy(request: {
  assets: Array<{
    id: string
    type: 'token' | 'nft_collection'
    allocation: number
  }>
  startDate: string // YYYY-MM-DD format
  endDate: string   // YYYY-MM-DD format
  initialValue: number
}): Promise<{
  data: {
    summary: {
      startDate: string
      endDate: string
      initialValue: number
      finalValue: number
      totalReturn: number
      annualizedReturn: number
      volatility: number
      sharpeRatio: number
    }
    timeSeries: Array<{
      date: string
      value: number
      return: number
    }>
    assetPerformance: Array<{
      id: string
      type: string
      allocation: number
      return: number
    }>
  }
  message: string
  timestamp: string
  meta?: any
}> {
  return apiRequestWithRetry<{
    data: {
      summary: {
        startDate: string
        endDate: string
        initialValue: number
        finalValue: number
        totalReturn: number
        annualizedReturn: number
        volatility: number
        sharpeRatio: number
      }
      timeSeries: Array<{
        date: string
        value: number
        return: number
      }>
      assetPerformance: Array<{
        id: string
        type: string
        allocation: number
        return: number
      }>
    }
    message: string
    timestamp: string
    meta?: any
  }>("/api/simulate/backtest", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

// Check simulation service health
export async function checkSimulationHealth(): Promise<{
  data: {
    status: string
    service: string
    features: {
      portfolioSimulation: boolean
      backtesting: boolean
      riskAnalysis: boolean
    }
  }
  message: string
  timestamp: string
  meta?: any
}> {
  return apiRequestWithRetry<{
    data: {
      status: string
      service: string
      features: {
        portfolioSimulation: boolean
        backtesting: boolean
        riskAnalysis: boolean
      }
    }
    message: string
    timestamp: string
    meta?: any
  }>("/api/simulate/health")
}

// Health check endpoint
export async function checkAPIHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/api/health")
}

// Export the APIError class for error handling
export { APIError }

// Type guard for API errors
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError
}