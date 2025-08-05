import { BaseEntity, Status, Priority, CulturalCategory, SentimentScore } from './common';

export interface Trend extends BaseEntity {
  title: string;
  description: string;
  category: CulturalCategory;
  status: Status;
  priority: Priority;
  
  // Trend metrics
  viralityScore: number; // 0-100
  momentumScore: number; // 0-100
  sentimentAnalysis: SentimentScore;
  
  // Social metrics
  socialMetrics: {
    mentions: number;
    shares: number;
    engagement: number;
    reach: number;
  };
  
  // Source information
  sources: TrendSource[];
  
  // Geographic data
  geography: {
    regions: string[];
    primaryMarket: string;
  };
  
  // Temporal data
  timeline: {
    startedAt: Date;
    peakAt?: Date;
    declineAt?: Date;
    estimatedDuration?: number; // hours
  };
  
  // Related keywords and hashtags
  keywords: string[];
  hashtags: string[];
  
  // Associated crypto/NFT opportunities
  opportunities?: string[]; // IDs of related opportunities
}

export interface TrendSource {
  platform: SocialPlatform;
  url?: string;
  authorHandle?: string;
  publishedAt: Date;
  metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export type SocialPlatform = 
  | 'twitter'
  | 'instagram' 
  | 'tiktok'
  | 'reddit'
  | 'discord'
  | 'telegram'
  | 'youtube'
  | 'twitch'
  | 'other';

// Trend analysis types
export interface TrendAnalysis {
  trend: Trend;
  analysis: {
    growthRate: number; // percentage per hour
    peakPrediction?: Date;
    confidenceLevel: number; // 0-1
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  relatedTrends: string[]; // Trend IDs
}

// Trend filtering and search
export interface TrendFilters {
  categories?: CulturalCategory[];
  statuses?: Status[];
  priorities?: Priority[];
  platforms?: SocialPlatform[];
  regions?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  viralityRange?: {
    min: number;
    max: number;
  };
  sentiments?: string[];
}

export type TrendSortBy = 
  | 'viralityScore'
  | 'momentumScore' 
  | 'createdAt'
  | 'mentions'
  | 'engagement';