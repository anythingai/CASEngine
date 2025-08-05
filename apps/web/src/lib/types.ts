// Frontend-specific types extending shared types
// These match the backend API endpoints and shared types

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Status = 'active' | 'inactive' | 'pending' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface SentimentScore {
  sentiment: Sentiment;
  confidence: number; // 0-1
  score: number; // -1 to 1
}

export type CulturalCategory = 
  | 'art'
  | 'music' 
  | 'fashion'
  | 'gaming'
  | 'memes'
  | 'lifestyle'
  | 'technology'
  | 'sports'
  | 'entertainment'
  | 'social';

// API Request/Response types for the main endpoints

// 1. POST /api/search - Full pipeline (main endpoint)
export interface SearchRequest {
  query: string;
  options?: {
    includeExpansion?: boolean;
    includeTaste?: boolean;
    includeAssets?: boolean;
    includeSimulation?: boolean;
    maxResults?: number;
  };
}

export interface SearchResponse {
  query: string;
  themes: string[];
  tasteProfile?: TasteProfile;
  assets?: AssetRecommendation[];
  simulation?: PortfolioSimulation;
  metadata: {
    processingTime: number;
    confidence: number;
    timestamp: string;
  };
}

// 2. POST /api/expand - Theme expansion
export interface ExpandRequest {
  query: string;
  maxThemes?: number;
}

export interface ExpandResponse {
  originalQuery: string;
  themes: string[];
  relatedConcepts: string[];
  categories: CulturalCategory[];
  confidence: number;
  timestamp: string;
}

// 3. POST /api/taste - Taste correlations
export interface TasteRequest {
  themes: string[];
  userPreferences?: string[];
}

export interface TasteResponse {
  profile: TasteProfile;
  correlations: TasteCorrelation[];
  recommendations: string[];
  confidence: number;
  timestamp: string;
}

export interface TasteProfile {
  primaryCategories: CulturalCategory[];
  sentiment: SentimentScore;
  riskTolerance: 'low' | 'medium' | 'high';
  investmentStyle: 'conservative' | 'moderate' | 'aggressive';
}

export interface TasteCorrelation {
  theme: string;
  correlation: number; // -1 to 1
  strength: number; // 0-100
  category: CulturalCategory;
}

// 4. POST /api/assets - Asset discovery
export interface AssetsRequest {
  themes: string[];
  tasteProfile?: TasteProfile;
  filters?: AssetFilters;
}

export interface AssetsResponse {
  assets: AssetRecommendation[];
  totalFound: number;
  filters: AssetFilters;
  timestamp: string;
}

export interface AssetRecommendation {
  symbol: string;
  name: string;
  type: AssetType;
  blockchain: Blockchain;
  contractAddress?: string;
  currentPrice?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  floorPrice?: number; // For NFTs
  recommendation: {
    action: ActionType;
    confidence: number;
    reasoning: string;
    targetPrice?: number;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    timeframe: string;
  };
  links?: {
    website?: string;
    twitter?: string;
    discord?: string;
    opensea?: string;
  };
}

export type AssetType = 
  | 'token'
  | 'nft_collection'
  | 'nft_individual'
  | 'defi_protocol'
  | 'gaming_asset'
  | 'metaverse_land'
  | 'dao_token'
  | 'meme_coin';

export type Blockchain = 
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'solana'
  | 'avalanche'
  | 'bsc'
  | 'other';

export type ActionType = 
  | 'buy'
  | 'sell' 
  | 'hold'
  | 'watch'
  | 'mint'
  | 'stake';

export interface AssetFilters {
  assetTypes?: AssetType[];
  blockchains?: Blockchain[];
  priceRange?: {
    min: number;
    max: number;
  };
  marketCapRange?: {
    min: number;
    max: number;
  };
  riskLevels?: string[];
  maxResults?: number;
}

// 5. POST /api/simulate - Portfolio simulation
export interface SimulateRequest {
  assets: {
    symbol: string;
    allocation: number; // percentage
    amount?: number; // USD amount
  }[];
  duration?: number; // days
  initialInvestment?: number; // USD
}

export interface SimulateResponse {
  simulation: PortfolioSimulation;
  recommendations: string[];
  riskAnalysis: RiskAnalysis;
  timestamp: string;
}

export interface PortfolioSimulation {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  timeframe: string;
  assets: {
    symbol: string;
    allocation: number;
    value: number;
    return: number;
    returnPercent: number;
  }[];
  performance: {
    sharpeRatio?: number;
    volatility?: number;
    maxDrawdown?: number;
  };
}

export interface RiskAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0-100
  factors: {
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }[];
  recommendations: string[];
}

// UI State types
export interface SearchState {
  query: string;
  isLoading: boolean;
  results: SearchResponse | null;
  error: string | null;
  step: 'input' | 'searching' | 'results' | 'error';
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  activeTab: string;
}

// Error types
export interface APIError {
  message: string;
  status?: number;
  code?: string;
}

// Health check
export interface HealthResponse {
  status: string;
  timestamp: string;
}