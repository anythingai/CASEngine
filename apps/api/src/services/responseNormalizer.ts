import { logger } from './loggingService';

export interface NormalizedAsset {
  id: string;
  type: 'token' | 'nft_collection';
  name: string;
  symbol?: string;
  description: string;
  price?: {
    current: number;
    currency: string;
    change24h?: number;
    changePercent24h?: number;
  };
  volume?: {
    volume24h: number;
    volumeTotal?: number;
  };
  marketCap?: number;
  floorPrice?: number;
  supply?: {
    circulating?: number;
    total?: number;
    max?: number;
  };
  metadata: {
    blockchain?: string;
    contractAddress?: string;
    createdDate?: string;
    verified?: boolean;
    category?: string;
  };
  links?: {
    website?: string;
    twitter?: string;
    discord?: string;
    opensea?: string;
  };
  images?: {
    thumbnail?: string;
    small?: string;
    large?: string;
  };
}

export interface ScoredAsset extends NormalizedAsset {
  scores: {
    relevance: number; // 0-100
    confidence: number; // 0-1
    cultural: {
      themeMatch: number; // 0-100
      socialBuzz: number; // 0-100
      narrativeStrength: number; // 0-100
      viralPotential: number; // 0-100
    };
    market: {
      liquidity: number; // 0-100
      momentum: number; // 0-100
      volatility: number; // 0-100
      community: number; // 0-100
    };
    risk: {
      level: 'low' | 'medium' | 'high' | 'extreme';
      score: number; // 0-100 (higher = more risky)
      factors: string[];
    };
  };
  reasoning: string;
  sources: string[];
  lastUpdated: string;
}

export interface NormalizedResponse<T> {
  data: T;
  metadata: {
    source: string;
    timestamp: string;
    cached: boolean;
    processingTime: number;
    confidence: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ErrorNormalizedResponse {
  error: {
    code: string;
    message: string;
     
    details?: any;
    retryable: boolean;
    source: string;
  };
  metadata: {
    timestamp: string;
    requestId?: string;
  };
}

export class ResponseNormalizer {
  private static instance: ResponseNormalizer;

  private constructor() {}

  static getInstance(): ResponseNormalizer {
    if (!ResponseNormalizer.instance) {
      ResponseNormalizer.instance = new ResponseNormalizer();
    }
    return ResponseNormalizer.instance;
  }

  // Normalize CoinGecko token response
   
  normalizeCoinGeckoToken(tokenData: any): NormalizedAsset {
    const marketData = tokenData.market_data || {};
    
    return {
      id: tokenData.id,
      type: 'token',
      name: tokenData.name || 'Unknown Token',
      symbol: tokenData.symbol?.toUpperCase(),
      description: this.cleanDescription(tokenData.description?.en || ''),
      price: {
        current: marketData.current_price?.usd || 0,
        currency: 'USD',
        change24h: marketData.price_change_24h,
        changePercent24h: marketData.price_change_percentage_24h,
      },
      volume: {
        volume24h: marketData.total_volume?.usd || 0,
      },
      marketCap: marketData.market_cap?.usd,
      supply: {
        circulating: marketData.circulating_supply,
        total: marketData.total_supply,
        max: marketData.max_supply,
      },
      metadata: {
        blockchain: 'ethereum', // Default assumption for CoinGecko tokens
        category: tokenData.categories?.[0] || 'general',
        createdDate: tokenData.genesis_date,
        verified: true, // CoinGecko tokens are generally verified
      },
      links: {
        website: tokenData.links?.homepage?.[0],
        twitter: tokenData.links?.twitter_screen_name
          ? `https://twitter.com/${tokenData.links.twitter_screen_name}`
          : '',
      },
      images: {
        thumbnail: tokenData.image?.thumb,
        small: tokenData.image?.small,
        large: tokenData.image?.large,
      },
    };
  }

  // Normalize OpenSea collection response
   
  normalizeOpenSeaCollection(collectionData: any): NormalizedAsset {
    const stats = collectionData.stats || {};
    
    return {
      id: collectionData.collection || collectionData.slug,
      type: 'nft_collection',
      name: collectionData.name || 'Unknown Collection',
      description: this.cleanDescription(collectionData.description || ''),
      floorPrice: stats.floor_price || 0,
      volume: {
        volume24h: stats.one_day_volume || 0,
        volumeTotal: stats.total_volume || 0,
      },
      supply: {
        total: stats.total_supply || 0,
      },
      metadata: {
        blockchain: collectionData.primary_asset_contracts?.[0]?.asset_contract_type || 'ethereum',
        contractAddress: collectionData.primary_asset_contracts?.[0]?.address,
        createdDate: collectionData.created_date,
        verified: collectionData.safelist_request_status === 'verified',
        category: 'nft',
      },
      links: {
        website: collectionData.external_url,
        twitter: collectionData.twitter_username
          ? `https://twitter.com/${collectionData.twitter_username}`
          : '',
        discord: collectionData.discord_url,
        opensea: `https://opensea.io/collection/${collectionData.slug}`,
      },
      images: {
        thumbnail: collectionData.image_url,
        small: collectionData.featured_image_url,
        large: collectionData.banner_image_url,
      },
    };
  }

  // Score and rank assets based on multiple factors
  scoreAsset(
    asset: NormalizedAsset,
    culturalContext: {
      keywords: string[];
      theme: string;
       
      socialMetrics?: any;
       
      tasteProfile?: any;
    },
    marketContext?: {
      trending?: boolean;
      momentum?: number;
      liquidity?: number;
    }
  ): ScoredAsset {
    const startTime = Date.now();

    try {
      // Calculate cultural alignment scores
      const culturalScores = this.calculateCulturalScores(asset, culturalContext);
      
      // Calculate market scores
      const marketScores = this.calculateMarketScores(asset, marketContext);
      
      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(asset, marketScores);
      
      // Calculate overall relevance and confidence
      const relevanceScore = this.calculateRelevanceScore(culturalScores, marketScores);
      const confidenceScore = this.calculateConfidenceScore(asset, culturalScores, marketScores);

      const scoredAsset: ScoredAsset = {
        ...asset,
        scores: {
          relevance: relevanceScore,
          confidence: confidenceScore,
          cultural: culturalScores,
          market: marketScores,
          risk: riskAssessment,
        },
        reasoning: this.generateReasoning(asset, culturalScores, marketScores, relevanceScore),
        sources: this.determineSources(asset),
        lastUpdated: new Date().toISOString(),
      };

      logger.logPerformance(
        `Asset scoring: ${asset.name}`,
        Date.now() - startTime,
        { assetId: asset.id, relevanceScore, confidenceScore }
      );

      return scoredAsset;
    } catch (error) {
      logger.error(
        'Failed to score asset',
        { assetId: asset.id, assetName: asset.name },
        error instanceof Error ? error : new Error(String(error))
      );

      // Return asset with default scores on error
      return {
        ...asset,
        scores: {
          relevance: 0,
          confidence: 0.1,
          cultural: {
            themeMatch: 0,
            socialBuzz: 0,
            narrativeStrength: 0,
            viralPotential: 0,
          },
          market: {
            liquidity: 0,
            momentum: 0,
            volatility: 50,
            community: 0,
          },
          risk: {
            level: 'extreme',
            score: 100,
            factors: ['Scoring failed'],
          },
        },
        reasoning: 'Asset scoring failed - manual review required',
        sources: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  // Normalize and wrap successful responses
  wrapSuccess<T>(
    data: T,
    source: string,
    cached: boolean = false,
    processingTime: number = 0,
    confidence: number = 1.0
  ): NormalizedResponse<T> {
    return {
      data,
      metadata: {
        source,
        timestamp: new Date().toISOString(),
        cached,
        processingTime,
        confidence,
      },
    };
  }

  // Normalize and wrap error responses
  wrapError(
    error: Error | string,
    code: string,
    source: string,
    retryable: boolean = true,
    requestId?: string
  ): ErrorNormalizedResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    
    logger.error(
      `Response error from ${source}`,
      { code, retryable, requestId: requestId || '' },
      error instanceof Error ? error : undefined
    );

    return {
      error: {
        code,
        message: errorMessage,
        retryable,
        source,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: requestId || '',
      },
    };
  }

  // Private helper methods
  private cleanDescription(description: string): string {
    if (!description) return '';
    
    // Remove HTML tags and excessive whitespace
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit to 500 characters
  }

  private calculateCulturalScores(
    asset: NormalizedAsset,
     
    context: { keywords: string[]; theme: string; socialMetrics?: any; tasteProfile?: any }
  ) {
    const { keywords, theme, socialMetrics, tasteProfile } = context;
    
    // Theme matching (name and description analysis)
    const themeMatch = this.calculateThemeMatch(asset, theme, keywords);
    
    // Social buzz (from social media metrics if available)
    const socialBuzz = socialMetrics 
      ? Math.min(100, (socialMetrics.mentions || 0) * 2 + (socialMetrics.engagement || 0) / 100)
      : this.estimateSocialBuzz(asset);
    
    // Narrative strength (how well it fits the cultural narrative)
    const narrativeStrength = this.calculateNarrativeStrength(asset, keywords, tasteProfile);
    
    // Viral potential (based on current momentum and social indicators)
    const viralPotential = Math.min(100, 
      (socialBuzz * 0.4) + 
      (asset.volume?.volume24h || 0) / 100000 * 20 +
      (themeMatch * 0.4)
    );

    return {
      themeMatch: Math.round(themeMatch),
      socialBuzz: Math.round(socialBuzz),
      narrativeStrength: Math.round(narrativeStrength),
      viralPotential: Math.round(viralPotential),
    };
  }

  private calculateMarketScores(
    asset: NormalizedAsset,
    context?: { trending?: boolean; momentum?: number; liquidity?: number }
  ) {
    // Liquidity score based on volume
    const volume24h = asset.volume?.volume24h || 0;
    const liquidity = context?.liquidity || Math.min(100, volume24h / 10000); // $10k = 1 point
    
    // Momentum score based on price change and trending status
    const priceChange = asset.price?.changePercent24h || 0;
    const momentum = context?.momentum || Math.max(0, Math.min(100, 
      (priceChange > 0 ? priceChange * 2 : 0) + (context?.trending ? 20 : 0)
    ));
    
    // Volatility score (higher volatility = higher score)
    const volatility = Math.min(100, Math.abs(priceChange) * 2);
    
    // Community score based on various factors
    const community = this.calculateCommunityScore(asset);

    return {
      liquidity: Math.round(liquidity),
      momentum: Math.round(momentum),
      volatility: Math.round(volatility),
      community: Math.round(community),
    };
  }

  private calculateRiskAssessment(
    asset: NormalizedAsset,
    marketScores: { liquidity: number; momentum: number; volatility: number; community: number }
  ) {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Liquidity risk
    if (marketScores.liquidity < 20) {
      riskFactors.push('Low liquidity');
      riskScore += 25;
    }

    // Volatility risk
    if (marketScores.volatility > 70) {
      riskFactors.push('High volatility');
      riskScore += 20;
    }

    // Market cap risk (for tokens)
    if (asset.type === 'token' && (asset.marketCap || 0) < 10000000) {
      riskFactors.push('Small market cap');
      riskScore += 15;
    }

    // Verification risk
    if (!asset.metadata.verified) {
      riskFactors.push('Unverified asset');
      riskScore += 20;
    }

    // Community risk
    if (marketScores.community < 30) {
      riskFactors.push('Weak community');
      riskScore += 10;
    }

    // Age risk (newer assets are riskier)
    if (asset.metadata.createdDate) {
      const createdDate = new Date(asset.metadata.createdDate);
      const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 30) {
        riskFactors.push('Very new asset');
        riskScore += 15;
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (riskScore < 25) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else if (riskScore < 80) riskLevel = 'high';
    else riskLevel = 'extreme';

    return {
      level: riskLevel,
      score: Math.min(100, riskScore),
      factors: riskFactors,
    };
  }

  private calculateRelevanceScore(
    culturalScores: { themeMatch: number; socialBuzz: number; narrativeStrength: number; viralPotential: number },
    marketScores: { liquidity: number; momentum: number; volatility: number; community: number }
  ): number {
    // Weighted combination of cultural and market factors
    const culturalWeight = 0.6;
    const marketWeight = 0.4;

    const culturalScore = (
      culturalScores.themeMatch * 0.4 +
      culturalScores.narrativeStrength * 0.3 +
      culturalScores.socialBuzz * 0.2 +
      culturalScores.viralPotential * 0.1
    );

    const marketScore = (
      marketScores.momentum * 0.3 +
      marketScores.liquidity * 0.3 +
      marketScores.community * 0.3 +
      (100 - marketScores.volatility) * 0.1 // Lower volatility is better for relevance
    );

    return Math.round(culturalScore * culturalWeight + marketScore * marketWeight);
  }

  private calculateConfidenceScore(
    asset: NormalizedAsset,
     
    culturalScores: any,
     
    marketScores: any
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data availability
    if (asset.price?.current) confidence += 0.1;
    if (asset.volume?.volume24h) confidence += 0.1;
    if (asset.metadata.verified) confidence += 0.1;
    if (asset.description.length > 50) confidence += 0.1;
    if (asset.links?.website || asset.links?.twitter) confidence += 0.1;

    // Adjust based on score consistency
    const scoreVariance = this.calculateScoreVariance([
      culturalScores.themeMatch,
      culturalScores.narrativeStrength,
      marketScores.liquidity,
      marketScores.community,
    ]);

    // Lower variance = higher confidence
    confidence += (1 - scoreVariance / 100) * 0.1;

    return Math.min(1, Math.max(0.1, confidence));
  }

  private calculateThemeMatch(asset: NormalizedAsset, theme: string, keywords: string[]): number {
    let score = 0;
    const text = `${asset.name} ${asset.description}`.toLowerCase();
    const lowerTheme = theme.toLowerCase();

    // Direct theme match
    if (text.includes(lowerTheme)) score += 40;

    // Keyword matches
    let keywordMatches = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
        score += 5;
      }
    });

    // Bonus for multiple keyword matches
    if (keywordMatches > 2) score += 10;

    return Math.min(100, score);
  }

  private estimateSocialBuzz(asset: NormalizedAsset): number {
    let buzz = 0;

    // Base buzz on verification and links
    if (asset.metadata.verified) buzz += 20;
    if (asset.links?.twitter) buzz += 15;
    if (asset.links?.discord) buzz += 10;
    if (asset.links?.website) buzz += 10;

    // Volume-based buzz (for tokens)
    if (asset.type === 'token' && asset.volume?.volume24h) {
      buzz += Math.min(30, asset.volume.volume24h / 50000); // $50k = 1 point
    }

    // NFT-specific buzz
    if (asset.type === 'nft_collection' && asset.volume?.volume24h) {
      buzz += Math.min(25, asset.volume.volume24h * 10); // 0.1 ETH = 1 point
    }

    return Math.min(100, buzz);
  }

  private calculateNarrativeStrength(
    asset: NormalizedAsset,
    keywords: string[],
     
    tasteProfile?: any
  ): number {
    let strength = 0;

    // Category alignment
     
    if ((tasteProfile as any)?.categories) {
      const assetCategory = asset.metadata.category || '';
       
      if ((tasteProfile as any).categories.some((cat: string) =>
        assetCategory.toLowerCase().includes(cat.toLowerCase())
      )) {
        strength += 30;
      }
    }

    // Description quality and relevance
    if (asset.description.length > 100) strength += 10;
    if (asset.description.length > 200) strength += 5;

    // Keyword density in description
    const descriptionWords = asset.description.toLowerCase().split(/\s+/);
    const keywordCount = keywords.reduce((count, keyword) => {
      return count + descriptionWords.filter(word => 
        word.includes(keyword.toLowerCase())
      ).length;
    }, 0);
    strength += Math.min(25, keywordCount * 5);

    // Brand/project maturity
    if (asset.metadata.verified) strength += 15;
    if (asset.links?.website && asset.links?.twitter) strength += 10;

    return Math.min(100, strength);
  }

  private calculateCommunityScore(asset: NormalizedAsset): number {
    let score = 0;

    // Social presence
    if (asset.links?.twitter) score += 25;
    if (asset.links?.discord) score += 20;
    if (asset.links?.website) score += 15;

    // Verification status
    if (asset.metadata.verified) score += 20;

    // Market activity (proxy for community engagement)
    if (asset.type === 'token' && asset.marketCap) {
      score += Math.min(15, asset.marketCap / 10000000); // $10M = 1 point
    }

    if (asset.type === 'nft_collection' && asset.supply?.total) {
      // Larger collections often have bigger communities
      score += Math.min(10, asset.supply.total / 1000); // 1000 items = 1 point
    }

    return Math.min(100, score);
  }

  private calculateScoreVariance(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    return Math.sqrt(variance);
  }

  private generateReasoning(
    asset: NormalizedAsset,
     
    culturalScores: any,
     
    marketScores: any,
    relevanceScore: number
  ): string {
    const reasons: string[] = [];

    // Cultural factors
    if (culturalScores.themeMatch > 60) {
      reasons.push(`Strong theme alignment (${culturalScores.themeMatch}/100)`);
    }
    if (culturalScores.socialBuzz > 50) {
      reasons.push(`Active social presence (${culturalScores.socialBuzz}/100)`);
    }

    // Market factors
    if (marketScores.momentum > 60) {
      reasons.push(`Strong market momentum (${marketScores.momentum}/100)`);
    }
    if (marketScores.liquidity > 70) {
      reasons.push(`Good liquidity (${marketScores.liquidity}/100)`);
    }

    // Risk factors
    if (marketScores.volatility > 70) {
      reasons.push(`High volatility detected (${marketScores.volatility}/100)`);
    }

    // Verification
    if (asset.metadata.verified) {
      reasons.push('Verified asset');
    }

    // Default reasoning if no specific reasons
    if (reasons.length === 0) {
      if (relevanceScore > 50) {
        reasons.push('Moderate cultural and market alignment');
      } else {
        reasons.push('Limited alignment with cultural theme');
      }
    }

    return reasons.join('. ') + '.';
  }

  private determineSources(asset: NormalizedAsset): string[] {
    const sources: string[] = [];

    if (asset.type === 'token') {
      sources.push('CoinGecko');
    }
    if (asset.type === 'nft_collection') {
      sources.push('OpenSea');
    }
    if (asset.links?.twitter) {
      sources.push('Twitter');
    }

    return sources;
  }

  // Batch processing methods
  normalizeAssetBatch(assets: any[], type: 'coingecko' | 'opensea'): NormalizedAsset[] {
    return assets.map(asset => {
      try {
        return type === 'coingecko' 
          ? this.normalizeCoinGeckoToken(asset)
          : this.normalizeOpenSeaCollection(asset);
      } catch (error) {
        logger.error(
          `Failed to normalize ${type} asset`,
          { assetId: asset.id || asset.slug, type },
          error instanceof Error ? error : new Error(String(error))
        );
        return null;
      }
    }).filter((asset): asset is NormalizedAsset => asset !== null);
  }

  scoreAssetBatch(
    assets: NormalizedAsset[],
     
    culturalContext: any,
     
    marketContext?: any
  ): ScoredAsset[] {
    return assets.map(asset => this.scoreAsset(asset, culturalContext, marketContext));
  }
}

// Export singleton instance
export const responseNormalizer = ResponseNormalizer.getInstance();