import { GPTService, ThemeExpansion } from './gptService';
import { QlooService, QlooRecommendation } from './qlooService';
import { CoinGeckoService, CoinGeckoAssetMatch } from './coingeckoService';
import { OpenSeaService, OpenSeaAssetMatch } from './openseaService';
import { SocialService, SocialTrendAnalysis } from './socialService';
import { cacheService, CacheKeys } from './cacheService';

export interface AssetMatch {
  id: string;
  type: 'token' | 'nft_collection';
  name: string;
  symbol?: string;
  description: string;
  relevanceScore: number;
  confidence: number;
  currentPrice?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  floorPrice?: number;
  socialMetrics: {
    mentions: number;
    sentiment: number;
    trendingScore: number;
    viralPotential: number;
  };
  culturalAlignment: {
    themeMatch: number;
    aestheticRelevance: number;
    narrativeStrength: number;
    communityResonance: number;
  };
  marketMetrics: {
    liquidityScore: number;
    momentumScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    timeHorizon: string;
  };
  reasoning: string;
  sources: string[];
  imageUrl?: string;
  links?: {
    website?: string;
    twitter?: string;
    discord?: string;
    opensea?: string;
  };
}

export interface TrendResult {
  originalVibe: string;
  themeExpansion: ThemeExpansion;
  tasteProfile: QlooRecommendation;
  socialAnalysis: Record<string, SocialTrendAnalysis>;
  assetMatches: AssetMatch[];
  overallScore: number;
  confidence: number;
  processing: {
    totalTime: number;
    apiCalls: number;
    cached: number;
    errors: string[];
  };
  recommendations: {
    summary: string;
    topAssets: AssetMatch[];
    marketTiming: string;
    riskAssessment: string;
    actionItems: string[];
  };
  metadata: {
    generatedAt: string;
    expiresAt: string;
    version: string;
    pipeline: string[];
  };
}

export interface OrchestrationOptions {
  useCache?: boolean;
  maxAssets?: number;
  includeNFTs?: boolean;
  includeTokens?: boolean;
  riskTolerance?: 'low' | 'medium' | 'high';
  timeHorizon?: 'short' | 'medium' | 'long';
  minConfidence?: number;
  enableParallelProcessing?: boolean;
}

export class OrchestrationService {
  private gptService: GPTService;
  private qlooService: QlooService;
  private coingeckoService: CoinGeckoService;
  private openseaService: OpenSeaService;
  private socialService: SocialService;

  constructor() {
    this.gptService = new GPTService();
    this.qlooService = new QlooService();
    this.coingeckoService = new CoinGeckoService();
    this.openseaService = new OpenSeaService();
    this.socialService = new SocialService();
  }

  async processFullPipeline(
    vibe: string,
    options: OrchestrationOptions = {}
  ): Promise<TrendResult> {
    const startTime = Date.now();
    const pipeline: string[] = [];
    const errors: string[] = [];
    let apiCalls = 0;
    let cached = 0;

    const {
      useCache = true,
      maxAssets = 20,
      includeNFTs = true,
      includeTokens = true,
      riskTolerance = 'medium',
      timeHorizon = 'medium',
      minConfidence = 0.3,
      enableParallelProcessing = true,
    } = options;

    // Check cache first for full pipeline
    if (useCache) {
      const cacheKey = CacheKeys.fullPipeline(vibe);
      const cachedResult = cacheService.get<TrendResult>(cacheKey);
      if (cachedResult) {
        return {
          ...cachedResult,
          processing: {
            ...cachedResult.processing,
            cached: cachedResult.processing.cached + 1,
          },
        };
      }
    }

    try {
      // Step 1: Theme Expansion (LLM)
      pipeline.push('theme_expansion');
      const themeExpansion = await this.gptService.expandTheme(vibe, useCache);
      apiCalls++;

      // Step 2: Qloo Taste Correlation
      pipeline.push('taste_correlation');
      const tasteProfile = await this.qlooService.getTasteCorrelations(
        vibe,
        themeExpansion.expandedKeywords,
        themeExpansion.categories,
        useCache
      );
      apiCalls++;

      // Step 3: Social Media Analysis (parallel)
      pipeline.push('social_analysis');
      const socialPromises: Promise<[string, SocialTrendAnalysis]>[] = [];
      
      // Analyze main theme and top keywords
      const keywordsToAnalyze = [vibe, ...themeExpansion.expandedKeywords.slice(0, 3)];
      
      if (enableParallelProcessing) {
        for (const keyword of keywordsToAnalyze) {
          socialPromises.push(
            this.socialService.analyzeSocialTrend(keyword).then(
              (analysis) => [keyword, analysis] as [string, SocialTrendAnalysis]
            )
          );
        }
        apiCalls += keywordsToAnalyze.length;
      } else {
        // Sequential processing
        for (const keyword of keywordsToAnalyze) {
          const analysis = await this.socialService.analyzeSocialTrend(keyword);
          socialPromises.push(Promise.resolve([keyword, analysis]));
          apiCalls++;
        }
      }

      const socialResults = await Promise.allSettled(socialPromises);
      const socialAnalysis: Record<string, SocialTrendAnalysis> = {};
      
      socialResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const [keyword, analysis] = result.value;
          socialAnalysis[keyword] = analysis;
        } else {
          errors.push(`Social analysis failed for keyword ${keywordsToAnalyze[index]}: ${result.reason}`);
        }
      });

      // Step 4: Asset Discovery (parallel)
      pipeline.push('asset_discovery');
      const assetPromises: Promise<AssetMatch[]>[] = [];
      
      if (includeTokens) {
        assetPromises.push(this.discoverTokens(themeExpansion, tasteProfile, socialAnalysis));
      }
      
      if (includeNFTs) {
        assetPromises.push(this.discoverNFTs(themeExpansion, tasteProfile, socialAnalysis));
      }

      const assetResults = await Promise.allSettled(assetPromises);
      let allAssets: AssetMatch[] = [];

      assetResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allAssets.push(...result.value);
        } else {
          const assetType = index === 0 && includeTokens ? 'tokens' : 'NFTs';
          errors.push(`Asset discovery failed for ${assetType}: ${result.reason}`);
        }
      });

      apiCalls += assetPromises.length * 3; // Approximate API calls per asset type

      // Step 5: Score and Filter Assets
      pipeline.push('scoring_filtering');
      const scoredAssets = await this.scoreAndFilterAssets(
        allAssets,
        themeExpansion,
        socialAnalysis,
        { minConfidence, maxAssets, riskTolerance }
      );

      // Step 6: Generate AI Summary and Recommendations
      pipeline.push('ai_summary');
      const recommendations = await this.generateRecommendations(
        vibe,
        themeExpansion,
        scoredAssets,
        socialAnalysis,
        { riskTolerance, timeHorizon }
      );
      apiCalls++;

      // Calculate overall metrics
      const overallScore = this.calculateOverallScore(scoredAssets, socialAnalysis);
      const confidence = this.calculateOverallConfidence(themeExpansion, scoredAssets, socialAnalysis);

      const totalTime = Date.now() - startTime;

      const result: TrendResult = {
        originalVibe: vibe,
        themeExpansion,
        tasteProfile,
        socialAnalysis,
        assetMatches: scoredAssets,
        overallScore,
        confidence,
        processing: {
          totalTime,
          apiCalls,
          cached,
          errors,
        },
        recommendations,
        metadata: {
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          version: '1.0.0',
          pipeline,
        },
      };

      // Cache the full result
      if (useCache) {
        cacheService.set(CacheKeys.fullPipeline(vibe), result, 'medium');
      }

      return result;

    } catch (error) {
      console.error('[OrchestrationService] Pipeline failed:', error);
      
      // Return error result with partial data
      return {
        originalVibe: vibe,
        themeExpansion: {
          originalTheme: vibe,
          expandedKeywords: [vibe],
          categories: ['general'],
          culturalContext: {
            description: 'Pipeline failed - partial results only',
            demographics: [],
            platforms: [],
            timeframe: 'unknown'
          },
          relatedTrends: [],
          sentiment: 'neutral',
          confidence: 0.1,
        },
        tasteProfile: {
          recommendations: [],
          tasteProfile: {
            keywords: [vibe],
            categories: [],
            demographics: { ageRange: '18-35', interests: [], behaviors: [] },
            culturalAffinities: [],
            brandAffinities: [],
            contentPreferences: [],
          },
          metadata: { totalAnalyzed: 0, processingTime: 0, algorithmVersion: '1.0.0' },
        },
        socialAnalysis: {},
        assetMatches: [],
        overallScore: 0,
        confidence: 0,
        processing: {
          totalTime: Date.now() - startTime,
          apiCalls,
          cached,
          errors: [error instanceof Error ? error.message : 'Unknown error', ...errors],
        },
        recommendations: {
          summary: 'Pipeline processing failed. Please try again later.',
          topAssets: [],
          marketTiming: 'Unknown',
          riskAssessment: 'High - Analysis incomplete',
          actionItems: ['Retry analysis', 'Check system status'],
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes for error case
          version: '1.0.0',
          pipeline,
        },
      };
    }
  }

  private async discoverTokens(
    themeExpansion: ThemeExpansion,
    tasteProfile: QlooRecommendation,
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ): Promise<AssetMatch[]> {
    const keywords = [
      ...themeExpansion.expandedKeywords,
      ...tasteProfile.recommendations.map(r => r.item),
    ];

    const coinGeckoMatches = await this.coingeckoService.findRelevantTokens(
      keywords,
      15
    );

    return coinGeckoMatches.map(match => this.normalizeCoinGeckoMatch(match, socialAnalysis));
  }

  private async discoverNFTs(
    themeExpansion: ThemeExpansion,
    tasteProfile: QlooRecommendation,
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ): Promise<AssetMatch[]> {
    const keywords = [
      ...themeExpansion.expandedKeywords,
      ...tasteProfile.recommendations.map(r => r.item),
    ];

    const openSeaMatches = await this.openseaService.findRelevantNFTs(
      keywords,
      15
    );

    return openSeaMatches.map(match => this.normalizeOpenSeaMatch(match, socialAnalysis));
  }

  private async scoreAndFilterAssets(
    assets: AssetMatch[],
    themeExpansion: ThemeExpansion,
    socialAnalysis: Record<string, SocialTrendAnalysis>,
    options: { minConfidence: number; maxAssets: number; riskTolerance: string }
  ): Promise<AssetMatch[]> {
    // Enhanced scoring based on all available data
    const enhancedAssets = assets.map(asset => {
      const enhancedAsset = { ...asset };
      
      // Boost score based on social metrics
      const avgSocialScore = Object.values(socialAnalysis).reduce(
        (sum, analysis) => sum + analysis.overallScore, 0
      ) / Math.max(1, Object.keys(socialAnalysis).length);
      
      enhancedAsset.relevanceScore += (avgSocialScore / 100) * 10;
      
      // Adjust confidence based on theme expansion confidence
      enhancedAsset.confidence = (enhancedAsset.confidence + themeExpansion.confidence) / 2;
      
      // Risk-adjusted scoring
      if (options.riskTolerance === 'low' && enhancedAsset.marketMetrics.riskLevel === 'high') {
        enhancedAsset.relevanceScore *= 0.7;
      } else if (options.riskTolerance === 'high' && enhancedAsset.marketMetrics.riskLevel === 'low') {
        enhancedAsset.relevanceScore *= 1.2;
      }

      return enhancedAsset;
    });

    return enhancedAssets
      .filter(asset => asset.confidence >= options.minConfidence)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxAssets);
  }

  private async generateRecommendations(
    vibe: string,
    themeExpansion: ThemeExpansion,
    assets: AssetMatch[],
    socialAnalysis: Record<string, SocialTrendAnalysis>,
    options: { riskTolerance: string; timeHorizon: string }
  ): Promise<TrendResult['recommendations']> {
    try {
      const aiSummary = await this.gptService.summarizeAssetOpportunities(
        assets.slice(0, 10),
        vibe
      );

      return {
        summary: aiSummary.summary,
        topAssets: assets.slice(0, 5),
        marketTiming: aiSummary.marketTiming,
        riskAssessment: aiSummary.riskAssessment,
        actionItems: this.generateActionItems(assets, socialAnalysis, options),
      };
    } catch (error) {
      // Fallback recommendations
      return {
        summary: `Analysis of "${vibe}" reveals ${assets.length} relevant opportunities across ${themeExpansion.categories.join(', ')} categories.`,
        topAssets: assets.slice(0, 5),
        marketTiming: 'Consider current market conditions before investing.',
        riskAssessment: `${options.riskTolerance} risk tolerance recommended for this analysis.`,
        actionItems: [
          'Review top asset recommendations',
          'Monitor social sentiment trends',
          'Consider portfolio allocation',
          'Set up price alerts',
        ],
      };
    }
  }

  private generateActionItems(
    assets: AssetMatch[],
    socialAnalysis: Record<string, SocialTrendAnalysis>,
    options: { riskTolerance: string; timeHorizon: string }
  ): string[] {
    const items: string[] = [];

    if (assets.length > 0) {
      const topAsset = assets[0];
      if (topAsset) {
        items.push(`Research ${topAsset.name} further (highest relevance score: ${topAsset.relevanceScore})`);
      }
    }

    const risingTrends = Object.entries(socialAnalysis)
      .filter(([, analysis]) => analysis.momentum === 'rising')
      .map(([keyword]) => keyword);

    if (risingTrends.length > 0) {
      items.push(`Monitor rising trends: ${risingTrends.join(', ')}`);
    }

    if (options.timeHorizon === 'short') {
      items.push('Set tight stop-losses for short-term positions');
      items.push('Monitor social sentiment closely for momentum shifts');
    } else {
      items.push('Consider dollar-cost averaging for long-term positions');
      items.push('Focus on fundamental value over short-term price action');
    }

    items.push('Diversify across multiple assets to manage risk');
    items.push('Stay updated with cultural trends and social media discussions');

    return items;
  }

  private calculateOverallScore(
    assets: AssetMatch[],
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ): number {
    if (assets.length === 0) return 0;

    const avgAssetScore = assets.reduce((sum, asset) => sum + asset.relevanceScore, 0) / assets.length;
    
    const socialScores = Object.values(socialAnalysis);
    const avgSocialScore = socialScores.length > 0 
      ? socialScores.reduce((sum, analysis) => sum + analysis.overallScore, 0) / socialScores.length
      : 50;

    return Math.round((avgAssetScore * 0.6) + (avgSocialScore * 0.4));
  }

  private calculateOverallConfidence(
    themeExpansion: ThemeExpansion,
    assets: AssetMatch[],
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ): number {
    const themeConfidence = themeExpansion.confidence;
    
    const avgAssetConfidence = assets.length > 0
      ? assets.reduce((sum, asset) => sum + asset.confidence, 0) / assets.length
      : 0.3;

    const socialConfidence = Object.keys(socialAnalysis).length > 0 ? 0.7 : 0.4;

    return Math.min(1, (themeConfidence * 0.4) + (avgAssetConfidence * 0.4) + (socialConfidence * 0.2));
  }

  private normalizeCoinGeckoMatch(
    match: CoinGeckoAssetMatch,
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ): AssetMatch {
    const token = match.token;
    const socialMetrics = this.extractSocialMetrics(token.name, token.symbol, socialAnalysis);
    
    return {
      id: token.id,
      type: 'token',
      name: token.name,
      symbol: token.symbol,
      description: `${token.name} (${token.symbol}) - Market Cap: $${(token.marketCap / 1000000).toFixed(1)}M`,
      relevanceScore: match.relevanceScore,
      confidence: 0.7, // Base confidence for CoinGecko data
      currentPrice: token.currentPrice,
      priceChange24h: token.priceChangePercent24h,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      socialMetrics,
      culturalAlignment: {
        themeMatch: match.culturalAlignment.narrativeMatch,
        aestheticRelevance: 50, // Not applicable to tokens
        narrativeStrength: match.culturalAlignment.narrativeMatch,
        communityResonance: match.marketMetrics.communityScore,
      },
      marketMetrics: {
        liquidityScore: match.marketMetrics.liquidityScore,
        momentumScore: match.marketMetrics.momentumScore,
        riskLevel: this.calculateRiskLevel(token.priceChangePercent24h, token.marketCap),
        timeHorizon: 'medium',
      },
      reasoning: match.reasoning,
      sources: ['coingecko'],
    };
  }

  private normalizeOpenSeaMatch(
    match: OpenSeaAssetMatch,
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ): AssetMatch {
    const collection = match.collection;
    const socialMetrics = this.extractSocialMetrics(collection.name, '', socialAnalysis);
    
    return {
      id: collection.slug,
      type: 'nft_collection',
      name: collection.name,
      description: collection.description || `NFT Collection - Floor: ${collection.floorPrice} ${collection.floorPriceSymbol}`,
      relevanceScore: match.relevanceScore,
      confidence: 0.6, // Base confidence for OpenSea data
      floorPrice: collection.floorPrice,
      volume24h: collection.volume24h,
      socialMetrics,
      culturalAlignment: {
        themeMatch: match.culturalAlignment.narrativeRelevance,
        aestheticRelevance: match.culturalAlignment.aestheticMatch,
        narrativeStrength: match.culturalAlignment.narrativeRelevance,
        communityResonance: match.marketMetrics.communityScore,
      },
      marketMetrics: {
        liquidityScore: match.marketMetrics.liquidityScore,
        momentumScore: match.marketMetrics.momentumScore,
        riskLevel: this.calculateNFTRiskLevel(collection.verificationStatus, collection.volume24h),
        timeHorizon: 'long',
      },
      reasoning: match.reasoning,
      sources: ['opensea'],
      imageUrl: collection.imageUrl,
      links: collection.socialLinks,
    };
  }

  private extractSocialMetrics(
    name: string,
    symbol: string,
    socialAnalysis: Record<string, SocialTrendAnalysis>
  ) {
    const relevantAnalyses = Object.entries(socialAnalysis).filter(([keyword]) => 
      name.toLowerCase().includes(keyword.toLowerCase()) || 
      (symbol && symbol.toLowerCase().includes(keyword.toLowerCase()))
    );

    if (relevantAnalyses.length === 0) {
      return {
        mentions: 0,
        sentiment: 0,
        trendingScore: 0,
        viralPotential: 0,
      };
    }

    const totalMentions = relevantAnalyses.reduce((sum, [, analysis]) => 
      sum + analysis.platforms.twitter.mentionCount + analysis.platforms.farcaster.castCount, 0
    );

    const avgSentiment = relevantAnalyses.reduce((sum, [, analysis]) => 
      sum + analysis.platforms.twitter.sentimentScore, 0
    ) / relevantAnalyses.length;

    const maxTrendingScore = Math.max(...relevantAnalyses.map(([, analysis]) => analysis.overallScore));
    const maxViralPotential = Math.max(...relevantAnalyses.map(([, analysis]) => analysis.viralPotential));

    return {
      mentions: totalMentions,
      sentiment: avgSentiment,
      trendingScore: maxTrendingScore,
      viralPotential: maxViralPotential,
    };
  }

  private calculateRiskLevel(priceChange: number, marketCap: number): 'low' | 'medium' | 'high' | 'extreme' {
    const volatility = Math.abs(priceChange);
    
    if (marketCap > 1000000000) { // > $1B
      return volatility > 20 ? 'medium' : 'low';
    } else if (marketCap > 100000000) { // > $100M
      return volatility > 30 ? 'high' : 'medium';
    } else {
      return volatility > 50 ? 'extreme' : 'high';
    }
  }

  private calculateNFTRiskLevel(
    verificationStatus: string,
    volume24h: number
  ): 'low' | 'medium' | 'high' | 'extreme' {
    if (verificationStatus === 'verified' && volume24h > 50) {
      return 'low';
    } else if (verificationStatus === 'verified' || volume24h > 10) {
      return 'medium';
    } else if (volume24h > 1) {
      return 'high';
    } else {
      return 'extreme';
    }
  }
}