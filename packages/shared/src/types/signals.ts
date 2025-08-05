import { BaseEntity, Status, Priority } from './common';

export interface Signal extends BaseEntity {
  title: string;
  description: string;
  type: SignalType;
  status: Status;
  priority: Priority;
  
  // Signal strength and confidence
  strength: number; // 0-100
  confidence: number; // 0-100
  
  // Related trend information
  relatedTrends: string[]; // Trend IDs
  
  // Opportunity details
  opportunity: {
    type: OpportunityType;
    asset: AssetInfo;
    action: ActionType;
    timing: TimingInfo;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    potentialReturn: number; // percentage
  };
  
  // Market data
  marketData: {
    currentPrice?: number;
    priceChange24h?: number;
    volume24h?: number;
    marketCap?: number;
    floorPrice?: number; // For NFTs
  };
  
  // Analysis metadata
  analysis: {
    generatedBy: 'ai' | 'manual' | 'hybrid';
    algorithmVersion?: string;
    dataQuality: number; // 0-1
    lastAnalyzed: Date;
  };
  
  // Historical performance
  performance?: {
    roi?: number;
    duration?: number; // days
    outcome?: 'success' | 'failure' | 'pending';
  };
}

export type SignalType = 
  | 'buy'
  | 'sell' 
  | 'hold'
  | 'watch'
  | 'mint'
  | 'stake';

export type OpportunityType = 
  | 'token'
  | 'nft_collection'
  | 'nft_individual'
  | 'defi_protocol'
  | 'gaming_asset'
  | 'metaverse_land'
  | 'dao_token'
  | 'meme_coin';

export interface AssetInfo {
  symbol: string;
  name: string;
  contractAddress?: string;
  blockchain: Blockchain;
  category: OpportunityType;
  description?: string;
  links?: {
    website?: string;
    twitter?: string;
    discord?: string;
    opensea?: string;
  };
}

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
  | 'immediate'
  | 'accumulate'
  | 'dollar_cost_average'
  | 'wait_for_dip'
  | 'exit_position'
  | 'take_profit'
  | 'set_stop_loss';

export interface TimingInfo {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string; // e.g., "24h", "1w", "1m"
  validUntil: Date;
  bestExecutionTime?: {
    start: Date;
    end: Date;
  };
}

// Signal filtering and search
export interface SignalFilters {
  types?: SignalType[];
  statuses?: Status[];
  priorities?: Priority[];
  opportunityTypes?: OpportunityType[];
  blockchains?: Blockchain[];
  strengthRange?: {
    min: number;
    max: number;
  };
  confidenceRange?: {
    min: number;
    max: number;
  };
  riskLevels?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export type SignalSortBy = 
  | 'strength'
  | 'confidence'
  | 'priority'
  | 'createdAt'
  | 'potentialReturn'
  | 'riskLevel';

// Portfolio tracking
export interface SignalPortfolio {
  id: string;
  name: string;
  signals: string[]; // Signal IDs
  totalValue: number;
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    winRate: number;
    averageHoldTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}