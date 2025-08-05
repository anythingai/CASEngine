import { BaseService } from './base';
import { config } from '@/config/environment';
import { cacheService, CacheKeys } from './cacheService';
import { getErrorMessage } from '@/utils/types';

export interface TwitterTrend {
  name: string;
  query: string;
  tweetVolume?: number;
  url: string;
  promoted?: boolean;
}

export interface TwitterMetrics {
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  listed: number;
  verified: boolean;
  location?: string;
  joinDate: string;
}

export interface SocialMention {
  id: string;
  platform: 'twitter' | 'farcaster';
  content: string;
  author: {
    handle: string;
    name: string;
    verified: boolean;
    followers: number;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  timestamp: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevanceScore: number;
  hashtags: string[];
  mentions: string[];
  url: string;
}

export interface FarcasterCast {
  hash: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    fid: number;
    pfpUrl?: string;
    followerCount: number;
    followingCount: number;
  };
  timestamp: string;
  reactions: {
    likes: number;
    recasts: number;
    replies: number;
  };
  embeds?: Array<{
    type: 'url' | 'image' | 'video';
    url: string;
     
    metadata?: any;
  }>;
  mentions: string[];
  channels: string[];
}

export interface SocialTrendAnalysis {
  keyword: string;
  platforms: {
    twitter: {
      mentionCount: number;
      sentimentScore: number;
      trending: boolean;
      topInfluencers: string[];
      hashtagFrequency: Record<string, number>;
    };
    farcaster: {
      castCount: number;
      engagementScore: number;
      topChannels: string[];
      activeUsers: number;
    };
  };
  overallScore: number;
  momentum: 'rising' | 'stable' | 'declining';
  culturalRelevance: number;
  viralPotential: number;
}

export class SocialService extends BaseService {
   
  private twitterClient: any;
   
  private farcasterClient: any;

  constructor() {
    super('https://api.twitter.com/2', 'SocialService');
    this.initializeClients();
  }

  private initializeClients(): void {
    // Twitter client setup
    if (config.social.twitter.bearerToken) {
      // In a real implementation, you'd initialize the Twitter API client here
      this.twitterClient = {
        bearer: config.social.twitter.bearerToken,
        baseURL: config.social.twitter.baseURL,
      };
    }

    // Farcaster client setup  
    if (config.social.farcaster.apiKey) {
      this.farcasterClient = {
        apiKey: config.social.farcaster.apiKey,
        baseURL: config.social.farcaster.baseURL,
      };
    }
  }

  async getTwitterTrends(location: string = 'global', useCache: boolean = true): Promise<TwitterTrend[]> {
    const cacheKey = CacheKeys.twitterTrends(location);
    
    if (useCache) {
      const cached = cacheService.get<TwitterTrend[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    if (!this.twitterClient?.bearer) {
      console.warn('[SocialService] Twitter API not configured, using fallback trends');
      return this.getFallbackTwitterTrends();
    }

    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/trends/place.json',
        params: this.buildParams({
          id: location === 'global' ? '1' : location,
        }),
        headers: {
          'Authorization': `Bearer ${this.twitterClient.bearer}`,
        },
      });

       
      const trends = this.normalizeTwitterTrends(response.data as any);
      
      if (useCache) {
        cacheService.set(cacheKey, trends, 'short');
      }

      return trends;
    } catch (error) {
      console.warn('[SocialService] Failed to get Twitter trends:', getErrorMessage(error));
      return this.getFallbackTwitterTrends();
    }
  }

  async searchTwitterMentions(
    query: string,
    count: number = 20
  ): Promise<SocialMention[]> {
    if (!this.twitterClient?.bearer) {
      console.warn('[SocialService] Twitter API not configured');
      return [];
    }

    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/tweets/search/recent',
        params: this.buildParams({
          query: `${query} -is:retweet`,
          max_results: Math.min(count, 100),
          'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
          'user.fields': 'name,username,verified,public_metrics',
          expansions: 'author_id',
        }),
        headers: {
          'Authorization': `Bearer ${this.twitterClient.bearer}`,
        },
      });

       
      return this.normalizeTwitterMentions(response.data as any, query);
    } catch (error) {
      console.warn(`[SocialService] Failed to search Twitter for "${query}":`, getErrorMessage(error));
      return [];
    }
  }

  async getFarcasterCasts(
    query?: string,
    limit: number = 50,
    useCache: boolean = true
  ): Promise<FarcasterCast[]> {
    const cacheKey = query ? `farcaster:search:${query}` : CacheKeys.farcasterTrends();
    
    if (useCache) {
      const cached = cacheService.get<FarcasterCast[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    if (!this.farcasterClient?.apiKey) {
      console.warn('[SocialService] Farcaster API not configured');
      return this.getFallbackFarcasterCasts();
    }

    try {
      const endpoint = query ? '/casts/search' : '/casts/trending';
       
      const params: any = { limit: Math.min(limit, 100) };
      if (query) {
        params.q = query;
      }

      const response = await this.makeRequest({
        method: 'GET',
        url: endpoint,
        params: this.buildParams(params),
        headers: {
          'Authorization': `Bearer ${this.farcasterClient.apiKey}`,
        },
         
        baseURL: (this.farcasterClient as any).baseURL,
      });

       
      const casts = this.normalizeFarcasterCasts((response.data as any).casts || []);
      
      if (useCache) {
        cacheService.set(cacheKey, casts, 'short');
      }

      return casts;
    } catch (error) {
      console.warn('[SocialService] Failed to get Farcaster casts:', getErrorMessage(error));
      return this.getFallbackFarcasterCasts();
    }
  }

  async analyzeSocialTrend(
    keyword: string
  ): Promise<SocialTrendAnalysis> {
    const [twitterMentions, farcasterCasts, twitterTrends] = await Promise.all([
      this.searchTwitterMentions(keyword, 100),
      this.getFarcasterCasts(keyword, 50),
      this.getTwitterTrends(),
    ]);

    // Analyze Twitter data
    const twitterAnalysis = this.analyzeTwitterData(keyword, twitterMentions, twitterTrends);
    
    // Analyze Farcaster data
    const farcasterAnalysis = this.analyzeFarcasterData(farcasterCasts);
    
    // Calculate overall metrics
    const overallScore = this.calculateOverallScore(twitterAnalysis, farcasterAnalysis);
    const momentum = this.calculateMomentum(twitterMentions, farcasterCasts);
    const culturalRelevance = this.calculateCulturalRelevance(keyword, twitterMentions, farcasterCasts);
    const viralPotential = this.calculateViralPotential(twitterMentions, farcasterCasts);

    return {
      keyword,
      platforms: {
        twitter: twitterAnalysis,
        farcaster: farcasterAnalysis,
      },
      overallScore,
      momentum,
      culturalRelevance,
      viralPotential,
    };
  }

  async getSocialInfluencers(
    topic: string,
    platform: 'twitter' | 'farcaster' | 'both' = 'both',
    limit: number = 10
  ): Promise<Array<{
    handle: string;
    platform: string;
    followers: number;
    engagement: number;
    relevanceScore: number;
    recentMentions: number;
  }>> {
     
    const influencers: any[] = [];

    if (platform === 'twitter' || platform === 'both') {
      const mentions = await this.searchTwitterMentions(topic, 50);
       
      const twitterInfluencers = this.extractTopInfluencers(mentions as any, 'twitter');
      influencers.push(...twitterInfluencers);
    }

    if (platform === 'farcaster' || platform === 'both') {
      const casts = await this.getFarcasterCasts(topic, 50);
       
      const farcasterInfluencers = this.extractTopInfluencers(casts as any, 'farcaster');
      influencers.push(...farcasterInfluencers);
    }

    return influencers
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

   
  private normalizeTwitterTrends(data: any): TwitterTrend[] {
     
    if (!data || !(data[0] as any)?.trends) {
      return [];
    }

     
    return data[0].trends.map((trend: any) => ({
      name: trend.name,
      query: trend.query,
      tweetVolume: trend.tweet_volume,
      url: trend.url,
      promoted: trend.promoted_content || false,
    }));
  }

   
  private normalizeTwitterMentions(data: any, query: string): SocialMention[] {
    if (!data?.data) {
      return [];
    }

     
    const users = (data.includes?.users || []).reduce((acc: any, user: any) => {
      acc[user.id] = user;
      return acc;
    }, {});

     
    return data.data.map((tweet: any) => {
      const author = users[tweet.author_id] || {};
      
      return {
        id: tweet.id,
        platform: 'twitter' as const,
        content: tweet.text,
        author: {
          handle: author.username || 'unknown',
          name: author.name || 'Unknown',
          verified: author.verified || false,
          followers: author.public_metrics?.followers_count || 0,
        },
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          views: tweet.public_metrics?.impression_count,
        },
        timestamp: tweet.created_at,
        sentiment: this.analyzeSentiment(tweet.text),
        relevanceScore: this.calculateRelevanceScore(tweet.text, query),
        hashtags: this.extractHashtags(tweet.text),
        mentions: this.extractMentions(tweet.text),
        url: `https://twitter.com/i/web/status/${tweet.id}`,
      };
    });
  }

   
  private normalizeFarcasterCasts(casts: any[]): FarcasterCast[] {
     
    return casts.map((cast: any) => ({
      hash: cast.hash,
      content: cast.text || '',
      author: {
        username: cast.author?.username || '',
        displayName: cast.author?.display_name || '',
        fid: cast.author?.fid || 0,
        pfpUrl: cast.author?.pfp_url,
        followerCount: cast.author?.follower_count || 0,
        followingCount: cast.author?.following_count || 0,
      },
      timestamp: cast.timestamp,
      reactions: {
        likes: cast.reactions?.likes || 0,
        recasts: cast.reactions?.recasts || 0,
        replies: cast.replies?.count || 0,
      },
      embeds: cast.embeds || [],
      mentions: cast.mentions || [],
      channels: cast.parent_author?.username ? [cast.parent_author.username] : [],
    }));
  }

  private analyzeTwitterData(keyword: string, mentions: SocialMention[], trends: TwitterTrend[]) {
    const mentionCount = mentions.length;
    const sentimentScores = mentions.map(m => this.sentimentToScore(m.sentiment));
    const sentimentScore = sentimentScores.length > 0 
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0;
    
    const trending = trends.some(trend => 
      trend.name.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const topInfluencers = mentions
      .filter(m => m.author.followers > 10000)
      .sort((a, b) => b.author.followers - a.author.followers)
      .slice(0, 5)
      .map(m => m.author.handle);
    
    const hashtagFrequency: Record<string, number> = {};
    mentions.forEach(mention => {
      mention.hashtags.forEach(hashtag => {
        hashtagFrequency[hashtag] = (hashtagFrequency[hashtag] || 0) + 1;
      });
    });

    return {
      mentionCount,
      sentimentScore,
      trending,
      topInfluencers,
      hashtagFrequency,
    };
  }

  private analyzeFarcasterData(casts: FarcasterCast[]) {
    const castCount = casts.length;
    const totalEngagement = casts.reduce((sum, cast) => 
      sum + cast.reactions.likes + cast.reactions.recasts + cast.reactions.replies, 0
    );
    const engagementScore = castCount > 0 ? totalEngagement / castCount : 0;
    
    const channelCounts: Record<string, number> = {};
    casts.forEach(cast => {
      cast.channels.forEach(channel => {
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      });
    });
    
    const topChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([channel]) => channel);
    
    const activeUsers = new Set(casts.map(cast => cast.author.username)).size;

    return {
      castCount,
      engagementScore,
      topChannels,
      activeUsers,
    };
  }

   
  private calculateOverallScore(twitterData: any, farcasterData: any): number {
    const twitterScore = Math.min(100, 
      (twitterData.mentionCount * 0.5) + 
      (twitterData.sentimentScore * 30) + 
      (twitterData.trending ? 20 : 0)
    );
    
    const farcasterScore = Math.min(100,
      (farcasterData.castCount * 2) +
      (farcasterData.engagementScore * 0.1) +
      (farcasterData.activeUsers * 2)
    );
    
    return Math.round((twitterScore * 0.7) + (farcasterScore * 0.3));
  }

  private calculateMomentum(twitterMentions: SocialMention[], farcasterCasts: FarcasterCast[]): 'rising' | 'stable' | 'declining' {
    // Simple momentum calculation based on recent activity
    const recentTwitter = twitterMentions.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - (6 * 60 * 60 * 1000) // Last 6 hours
    ).length;
    
    const recentFarcaster = farcasterCasts.filter(c =>
      new Date(c.timestamp).getTime() > Date.now() - (6 * 60 * 60 * 1000)
    ).length;
    
    const recentActivity = recentTwitter + recentFarcaster;
    const totalActivity = twitterMentions.length + farcasterCasts.length;
    
    if (totalActivity === 0) return 'stable';
    
    const recentRatio = recentActivity / totalActivity;
    
    if (recentRatio > 0.4) return 'rising';
    if (recentRatio < 0.2) return 'declining';
    return 'stable';
  }

  private calculateCulturalRelevance(_keyword: string, mentions: SocialMention[], casts: FarcasterCast[]): number {
    // Cultural relevance based on engagement quality and influencer participation
    let score = 0;
    
    // High-follower account participation
    const highInfluencerMentions = mentions.filter(m => m.author.followers > 50000).length;
    score += highInfluencerMentions * 10;
    
    // Verified account participation
    const verifiedMentions = mentions.filter(m => m.author.verified).length;
    score += verifiedMentions * 5;
    
    // Cross-platform presence
    if (mentions.length > 0 && casts.length > 0) {
      score += 15;
    }
    
    return Math.min(100, score);
  }

  private calculateViralPotential(mentions: SocialMention[], casts: FarcasterCast[]): number {
    // Viral potential based on engagement rates and content quality
    let score = 0;
    
    // High engagement tweets
    const highEngagementMentions = mentions.filter(m => 
      (m.metrics.likes + m.metrics.retweets) > (m.author.followers * 0.02)
    ).length;
    score += highEngagementMentions * 8;
    
    // Positive sentiment bias
    const positiveMentions = mentions.filter(m => m.sentiment === 'positive').length;
    score += (positiveMentions / Math.max(1, mentions.length)) * 20;
    
    // Farcaster engagement
    const avgFarcasterEngagement = casts.length > 0 
      ? casts.reduce((sum, c) => sum + c.reactions.likes + c.reactions.recasts, 0) / casts.length
      : 0;
    score += Math.min(30, avgFarcasterEngagement * 2);
    
    return Math.min(100, score);
  }

   
  private extractTopInfluencers(data: any[], platform: string) {
     
    const influencerMap: Record<string, any> = {};
    
     
    data.forEach((item: any) => {
      const handle = platform === 'twitter' ? item.author?.handle : item.author?.username;
      const followers = platform === 'twitter' ? item.author?.followers : item.author?.followerCount;
      
      if (!handle) return;
      
      if (!influencerMap[handle]) {
        influencerMap[handle] = {
          handle,
          platform,
          followers: followers || 0,
          engagement: 0,
          relevanceScore: 0,
          recentMentions: 0,
        };
      }
      
      influencerMap[handle].recentMentions += 1;
      
      if (platform === 'twitter') {
        influencerMap[handle].engagement += item.metrics?.likes + item.metrics?.retweets + item.metrics?.replies;
        influencerMap[handle].relevanceScore += item.relevanceScore || 0;
      } else {
        influencerMap[handle].engagement += item.reactions?.likes + item.reactions?.recasts + item.reactions?.replies;
        influencerMap[handle].relevanceScore += 50; // Base score for Farcaster
      }
    });
    
    return Object.values(influencerMap);
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis - in production, use a proper sentiment analysis service
    const positiveWords = ['good', 'great', 'amazing', 'love', 'awesome', 'fantastic', 'bullish', 'moon', 'rocket'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'scam', 'dump', 'bearish', 'crash', 'rekt'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private sentimentToScore(sentiment: 'positive' | 'negative' | 'neutral'): number {
    switch (sentiment) {
      case 'positive': return 1;
      case 'negative': return -1;
      case 'neutral': return 0;
    }
  }

  private calculateRelevanceScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    let score = 0;
    
    // Exact match
    if (lowerText.includes(lowerQuery)) score += 50;
    
    // Word matches
    const queryWords = lowerQuery.split(' ');
    const matchedWords = queryWords.filter(word => lowerText.includes(word)).length;
    score += (matchedWords / queryWords.length) * 30;
    
    // Hashtag/mention bonus
    if (text.includes('#') || text.includes('@')) score += 10;
    
    return Math.min(100, score);
  }

  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
  }

  private extractMentions(text: string): string[] {
    const mentions = text.match(/@\w+/g);
    return mentions ? mentions.map(mention => mention.substring(1)) : [];
  }

  // Fallback methods when APIs are not available
  private getFallbackTwitterTrends(): TwitterTrend[] {
    return [
      { name: 'AI', query: 'AI', url: '', tweetVolume: 50000 },
      { name: 'crypto', query: 'crypto', url: '', tweetVolume: 30000 },
      { name: 'NFTs', query: 'NFT', url: '', tweetVolume: 20000 },
      { name: 'web3', query: 'web3', url: '', tweetVolume: 15000 },
      { name: 'blockchain', query: 'blockchain', url: '', tweetVolume: 12000 },
    ];
  }

  private getFallbackFarcasterCasts(): FarcasterCast[] {
    return [
      {
        hash: 'fallback1',
        content: 'Excited about the future of decentralized social media!',
        author: {
          username: 'cryptouser',
          displayName: 'Crypto User',
          fid: 1234,
          followerCount: 500,
          followingCount: 200,
        },
        timestamp: new Date().toISOString(),
        reactions: { likes: 10, recasts: 3, replies: 2 },
        mentions: [],
        channels: ['crypto'],
      },
    ];
  }
}