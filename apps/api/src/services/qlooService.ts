import { BaseService } from './base';
import { config } from '@/config/environment';
import { cacheService, CacheKeys } from './cacheService';
import { GPTService } from './gptService';

export interface QlooTasteProfile {
  keywords: string[];
  categories: string[];
  demographics: {
    ageRange: string;
    interests: string[];
    behaviors: string[];
  };
  culturalAffinities: string[];
  brandAffinities: string[];
  contentPreferences: string[];
}

export interface QlooCorrelation {
  item: string;
  category: string;
  relevanceScore: number; // 0-100
  confidenceLevel: number; // 0-1
  reasoning: string;
  demographicMatch: number; // 0-100
  culturalAlignment: number; // 0-100
  trendingFactor: number; // 0-100
}

export interface QlooRecommendation {
  recommendations: QlooCorrelation[];
  tasteProfile: QlooTasteProfile;
  metadata: {
    totalAnalyzed: number;
    processingTime: number;
    algorithmVersion: string;
  };
}

export class QlooService extends BaseService {
  private gptService: GPTService;

  constructor() {
    const headers: Record<string, string> = {};
    
    if (config.qloo.apiKey) {
      headers['Authorization'] = `Bearer ${config.qloo.apiKey}`;
      headers['X-API-Key'] = config.qloo.apiKey;
    }

    super(config.qloo.baseURL, 'QlooService', headers);
    this.gptService = new GPTService();
  }

  async getTasteCorrelations(
    culturalTheme: string,
    keywords: string[],
    categories: string[] = [],
    useCache: boolean = true
  ): Promise<QlooRecommendation> {
    const cacheKey = CacheKeys.tasteCorrelation(
      categories.join(','),
      [culturalTheme, ...keywords].join(',')
    );
    
    if (useCache) {
      const cached = cacheService.get<QlooRecommendation>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.makeRequest({
        method: 'POST',
        url: '/taste/correlations',
        data: {
          query: {
            theme: culturalTheme,
            keywords,
            categories: categories.length > 0 ? categories : ['entertainment', 'fashion', 'technology', 'art'],
            limit: 20,
            includeMetadata: true,
          },
          options: {
            demographicWeighting: true,
            culturalContext: true,
            trendingBoost: true,
          }
        },
      });

      const recommendation = this.normalizeQlooResponse(response.data);
      
      if (useCache) {
        cacheService.set(cacheKey, recommendation, 'medium');
      }

      return recommendation;
    } catch (error) {
      console.warn('[QlooService] API call failed, using AI fallback:', (error as any).message || error);
      return this.generateAIFallbackRecommendation(culturalTheme, keywords, categories);
    }
  }

  async getInfluencerCorrelations(
    culturalProfile: QlooTasteProfile,
    platforms: string[] = ['twitter', 'instagram', 'tiktok']
  ): Promise<{
    influencers: Array<{
      handle: string;
      platform: string;
      relevanceScore: number;
      followerCount: number;
      engagementRate: number;
      culturalAlignment: number;
    }>;
    totalAnalyzed: number;
  }> {
    try {
      const response = await this.makeRequest({
        method: 'POST',
        url: '/influencers/correlate',
        data: {
          tasteProfile: culturalProfile,
          platforms,
          limit: 10,
          minFollowers: 10000,
        },
      });

      return this.normalizeInfluencerResponse(response.data);
    } catch (error) {
      console.warn('[QlooService] Influencer correlation failed:', (error as any).message || error);
      return {
        influencers: [],
        totalAnalyzed: 0,
      };
    }
  }

  async getBrandAffinities(
    tasteProfile: QlooTasteProfile,
    sectors: string[] = ['technology', 'fashion', 'entertainment']
  ): Promise<{
    brands: Array<{
      name: string;
      sector: string;
      affinityScore: number;
      reasoning: string;
      webPresence: {
        hasNFTs: boolean;
        hasCrypto: boolean;
        socialEngagement: number;
      };
    }>;
  }> {
    try {
      const response = await this.makeRequest({
        method: 'POST',
        url: '/brands/affinities',
        data: {
          tasteProfile,
          sectors,
          limit: 15,
          includeWebPresence: true,
        },
      });

      return this.normalizeBrandResponse(response.data);
    } catch (error) {
      console.warn('[QlooService] Brand affinity analysis failed:', (error as any).message || error);
      return { brands: [] };
    }
  }

  private normalizeQlooResponse(rawData: any): QlooRecommendation {
    // Transform Qloo's response format to our standardized format
    const recommendations = (rawData.recommendations || []).map((item: any) => ({
      item: item.name || item.title || 'Unknown',
      category: item.category || 'general',
      relevanceScore: Math.round((item.score || 0.5) * 100),
      confidenceLevel: item.confidence || 0.7,
      reasoning: item.explanation || 'Taste algorithm correlation',
      demographicMatch: Math.round((item.demographic_fit || 0.5) * 100),
      culturalAlignment: Math.round((item.cultural_relevance || 0.5) * 100),
      trendingFactor: Math.round((item.trending_score || 0.5) * 100),
    }));

    const tasteProfile: QlooTasteProfile = {
      keywords: rawData.profile?.keywords || [],
      categories: rawData.profile?.categories || [],
      demographics: {
        ageRange: rawData.profile?.demographics?.age_range || '18-35',
        interests: rawData.profile?.demographics?.interests || [],
        behaviors: rawData.profile?.demographics?.behaviors || [],
      },
      culturalAffinities: rawData.profile?.cultural_affinities || [],
      brandAffinities: rawData.profile?.brand_affinities || [],
      contentPreferences: rawData.profile?.content_preferences || [],
    };

    return {
      recommendations,
      tasteProfile,
      metadata: {
        totalAnalyzed: rawData.metadata?.total_analyzed || recommendations.length,
        processingTime: rawData.metadata?.processing_time || 0,
        algorithmVersion: rawData.metadata?.version || '1.0.0',
      },
    };
  }

  private normalizeInfluencerResponse(rawData: any): any {
    const influencers = (rawData.influencers || []).map((inf: any) => ({
      handle: inf.handle || inf.username || '',
      platform: inf.platform || 'unknown',
      relevanceScore: Math.round((inf.relevance || 0.5) * 100),
      followerCount: inf.followers || 0,
      engagementRate: inf.engagement_rate || 0,
      culturalAlignment: Math.round((inf.cultural_fit || 0.5) * 100),
    }));

    return {
      influencers,
      totalAnalyzed: rawData.total_analyzed || influencers.length,
    };
  }

  private normalizeBrandResponse(rawData: any): any {
    const brands = (rawData.brands || []).map((brand: any) => ({
      name: brand.name || 'Unknown Brand',
      sector: brand.sector || 'general',
      affinityScore: Math.round((brand.affinity || 0.5) * 100),
      reasoning: brand.reasoning || 'Taste correlation analysis',
      webPresence: {
        hasNFTs: brand.web_presence?.nft_activity || false,
        hasCrypto: brand.web_presence?.crypto_activity || false,
        socialEngagement: brand.web_presence?.social_score || 0,
      },
    }));

    return { brands };
  }

  // AI-powered fallback method when Qloo API is unavailable
  private async generateAIFallbackRecommendation(
    culturalTheme: string,
    keywords: string[],
    categories: string[]
  ): Promise<QlooRecommendation> {
    console.warn('[QlooService] Using AI-powered fallback recommendation generation');
    
    try {
      const context = `Generate taste correlations and cultural insights for the theme "${culturalTheme}" with focus on crypto/NFT relevance, demographic analysis, and trending factors.`;
      
      const analysis = await this.gptService.generateCulturalAnalysis(keywords, context);
      
      return this.transformAnalysisToTasteProfile(analysis, culturalTheme, keywords, categories);
    } catch (aiError) {
      console.warn('[QlooService] AI fallback failed, using basic fallback:', aiError);
      return this.generateBasicFallbackRecommendation(culturalTheme, keywords, categories);
    }
  }

  private transformAnalysisToTasteProfile(
    analysis: any,
    culturalTheme: string,
    keywords: string[],
    categories: string[]
  ): QlooRecommendation {
    // Transform the cultural analysis into taste correlations
    const recommendations: QlooCorrelation[] = [];
    
    // Generate correlations from opportunities
    (analysis.opportunities || []).slice(0, 8).forEach((opportunity: string, index: number) => {
      recommendations.push({
        item: opportunity,
        category: categories[index % categories.length] || 'general',
        relevanceScore: Math.max(60, analysis.culturalSignificance || 75),
        confidenceLevel: 0.8,
        reasoning: `AI-identified cultural opportunity: ${opportunity}`,
        demographicMatch: Math.max(70, analysis.trendPotential || 70),
        culturalAlignment: analysis.culturalSignificance || 75,
        trendingFactor: analysis.trendPotential || 70,
      });
    });

    // Add keyword-based correlations if we need more
    keywords.slice(0, 4).forEach((keyword, index) => {
      if (recommendations.length < 10) {
        recommendations.push({
          item: `${keyword} culture`,
          category: categories[index % categories.length] || 'lifestyle',
          relevanceScore: Math.max(65, 85 - index * 5),
          confidenceLevel: 0.75,
          reasoning: `Core cultural keyword: ${keyword}`,
          demographicMatch: 75,
          culturalAlignment: 80,
          trendingFactor: Math.max(60, 80 - index * 5),
        });
      }
    });

    const tasteProfile: QlooTasteProfile = {
      keywords,
      categories: categories.length > 0 ? categories : ['entertainment', 'fashion', 'technology', 'art'],
      demographics: {
        ageRange: '18-34',
        interests: keywords.slice(0, 5),
        behaviors: ['social_media_active', 'trend_following', 'early_adopter'],
      },
      culturalAffinities: [culturalTheme],
      brandAffinities: [],
      contentPreferences: categories.length > 0 ? categories : ['digital_art', 'tech_innovation', 'cultural_movements'],
    };

    return {
      recommendations,
      tasteProfile,
      metadata: {
        totalAnalyzed: recommendations.length,
        processingTime: 150,
        algorithmVersion: 'ai-cultural-analysis-1.0.0',
      },
    };
  }

  // Basic fallback as last resort
  private generateBasicFallbackRecommendation(
    culturalTheme: string,
    keywords: string[],
    categories: string[]
  ): QlooRecommendation {
    const recommendations: QlooCorrelation[] = keywords.slice(0, 10).map((keyword, index) => ({
      item: keyword,
      category: categories[index % categories.length] || 'general',
      relevanceScore: Math.max(60, 90 - index * 5),
      confidenceLevel: 0.6,
      reasoning: 'Keyword-based correlation (basic fallback)',
      demographicMatch: 70,
      culturalAlignment: 65,
      trendingFactor: Math.max(50, 80 - index * 3),
    }));

    const tasteProfile: QlooTasteProfile = {
      keywords,
      categories,
      demographics: {
        ageRange: '18-35',
        interests: keywords.slice(0, 5),
        behaviors: ['social_media_active', 'trend_following'],
      },
      culturalAffinities: [culturalTheme],
      brandAffinities: [],
      contentPreferences: categories,
    };

    return {
      recommendations,
      tasteProfile,
      metadata: {
        totalAnalyzed: recommendations.length,
        processingTime: 100,
        algorithmVersion: 'basic-fallback-1.0.0',
      },
    };
  }
}