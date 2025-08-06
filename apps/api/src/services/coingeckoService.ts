import { BaseService } from './base';
import { config } from '@/config/environment';
import { cacheService, CacheKeys } from './cacheService';
import { getErrorMessage } from '@/utils/types';

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
  ath: number;
  athDate: string;
  atl: number;
  atlDate: string;
  lastUpdated: string;
}

export interface TokenMarketData {
  prices: Array<[number, number]>; // [timestamp, price]
  marketCaps: Array<[number, number]>;
  volumes: Array<[number, number]>;
}

export interface TrendingToken {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  priceBtc: number;
  score: number;
}

export interface TokenSearch {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
  large: string;
}

export interface CoinGeckoAssetMatch {
  token: TokenInfo;
  relevanceScore: number;
  marketMetrics: {
    liquidityScore: number;
    volatilityScore: number;
    momentumScore: number;
    communityScore: number;
  };
  culturalAlignment: {
    socialMentions: number;
    trendingScore: number;
    narrativeMatch: number;
  };
  reasoning: string;
}

export class CoinGeckoService extends BaseService {
  // private readonly isProVersion: boolean;

  constructor() {
    const headers: Record<string, string> = {};
    
    if (config.coingecko.apiKey) {
      headers['x-cg-demo-api-key'] = config.coingecko.apiKey;
    }

    // Always use the regular API URL, even with API key (demo tier)
    const baseURL = config.coingecko.baseURL;
    
    super(baseURL, 'CoinGeckoService', headers);
  }

  async getTokenInfo(tokenId: string, useCache: boolean = true): Promise<TokenInfo | null> {
    const cacheKey = CacheKeys.tokenInfo(tokenId);
    
    if (useCache) {
      const cached = cacheService.get<TokenInfo>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: `/coins/${tokenId}`,
        params: this.buildParams({
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: false,
          sparkline: false,
        }),
      });

      const tokenInfo = this.normalizeTokenInfo(response.data);
      
      if (useCache) {
        cacheService.set(cacheKey, tokenInfo, 'short');
      }

      return tokenInfo;
    } catch (error) {
      console.warn(`[CoinGeckoService] Failed to get token info for ${tokenId}:`, getErrorMessage(error));
      return null;
    }
  }

  async getTokenPrice(tokenId: string, vsCurrency: string = 'usd'): Promise<number | null> {
    const cacheKey = CacheKeys.tokenPrice(`${tokenId}-${vsCurrency}`);
    
    const cached = cacheService.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/simple/price',
        params: this.buildParams({
          ids: tokenId,
          vs_currencies: vsCurrency,
          include_24hr_change: true,
        }),
      });

      const price = (response.data as any)[tokenId]?.[vsCurrency];
      if (typeof price === 'number') {
        cacheService.set(cacheKey, price, 'short');
        return price;
      }

      return null;
    } catch (error) {
      console.warn(`[CoinGeckoService] Failed to get price for ${tokenId}:`, getErrorMessage(error));
      return null;
    }
  }

  async getTrendingTokens(useCache: boolean = true): Promise<TrendingToken[]> {
    const cacheKey = CacheKeys.trendingCoins();
    
    if (useCache) {
      const cached = cacheService.get<TrendingToken[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/search/trending',
      });

      const trending = ((response.data as any).coins || []).map((coin: any) => ({
        id: coin.item.id,
        symbol: coin.item.symbol,
        name: coin.item.name,
        thumb: coin.item.thumb,
        small: coin.item.small,
        large: coin.item.large,
        slug: coin.item.slug,
        priceBtc: coin.item.price_btc,
        score: coin.item.score || 0,
      }));

      if (useCache) {
        cacheService.set(cacheKey, trending, 'medium');
      }

      return trending;
    } catch (error) {
      console.warn('[CoinGeckoService] Failed to get trending tokens:', (error as any).message);
      return [];
    }
  }

  async searchTokens(query: string, limit: number = 10): Promise<TokenSearch[]> {
    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/search',
        params: this.buildParams({ query }),
      });

      return ((response.data as any).coins || [])
        .slice(0, limit)
        .map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          marketCapRank: coin.market_cap_rank || 999999,
          thumb: coin.thumb,
          large: coin.large,
        }));
    } catch (error) {
      console.warn(`[CoinGeckoService] Failed to search for "${query}":`, (error as any).message);
      return [];
    }
  }

  async findRelevantTokens(
    keywords: string[],
    limit: number = 20
  ): Promise<CoinGeckoAssetMatch[]> {
    const matches: CoinGeckoAssetMatch[] = [];
    
    // Search for tokens based on keywords
    for (const keyword of keywords.slice(0, 5)) { // Limit API calls
      const searchResults = await this.searchTokens(keyword, 5);
      
      for (const result of searchResults) {
        const tokenInfo = await this.getTokenInfo(result.id);
        if (tokenInfo) {
          const match = this.createAssetMatch(tokenInfo, keyword, keywords);
          if (match.relevanceScore > 30) { // Filter low relevance
            matches.push(match);
          }
        }
      }
    }

    // Get trending tokens and check relevance
    const trending = await this.getTrendingTokens();
    for (const trendingToken of trending.slice(0, 10)) {
      const tokenInfo = await this.getTokenInfo(trendingToken.id);
      if (tokenInfo) {
        const match = this.createAssetMatch(tokenInfo, '', keywords);
        match.culturalAlignment.trendingScore = trendingToken.score;
        match.relevanceScore += 10; // Trending boost
        
        if (match.relevanceScore > 25) {
          matches.push(match);
        }
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueMatches = this.removeDuplicateMatches(matches);
    return uniqueMatches
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private normalizeTokenInfo(data: any): TokenInfo {
    const marketData = data.market_data || {};
    
    return {
      id: data.id,
      symbol: data.symbol?.toUpperCase() || '',
      name: data.name || '',
      currentPrice: marketData.current_price?.usd || 0,
      marketCap: marketData.market_cap?.usd || 0,
      volume24h: marketData.total_volume?.usd || 0,
      priceChange24h: marketData.price_change_24h || 0,
      priceChangePercent24h: marketData.price_change_percentage_24h || 0,
      circulatingSupply: marketData.circulating_supply || 0,
      totalSupply: marketData.total_supply || 0,
      maxSupply: marketData.max_supply,
      ath: marketData.ath?.usd || 0,
      athDate: marketData.ath_date?.usd || '',
      atl: marketData.atl?.usd || 0,
      atlDate: marketData.atl_date?.usd || '',
      lastUpdated: marketData.last_updated || new Date().toISOString(),
    };
  }

  private createAssetMatch(
    token: TokenInfo,
    matchedKeyword: string,
    allKeywords: string[]
  ): CoinGeckoAssetMatch {
    // Calculate relevance based on name/symbol matching
    let relevanceScore = 0;
    const tokenName = token.name.toLowerCase();
    const tokenSymbol = token.symbol.toLowerCase();
    
    // Direct matches
    if (allKeywords.some(k => tokenName.includes(k.toLowerCase()))) relevanceScore += 30;
    if (allKeywords.some(k => tokenSymbol.includes(k.toLowerCase()))) relevanceScore += 25;
    
    // Market metrics scoring
    const marketMetrics = {
      liquidityScore: Math.min(100, (token.volume24h / 1000000) * 10), // $1M = 10 points
      volatilityScore: Math.min(100, Math.abs(token.priceChangePercent24h) * 2),
      momentumScore: Math.max(0, token.priceChangePercent24h > 0 ? token.priceChangePercent24h * 3 : 0),
      communityScore: Math.min(100, (token.marketCap / 1000000) * 0.1), // $10M = 1 point
    };

    // Cultural alignment (mock data - would be enhanced with social data)
    const culturalAlignment = {
      socialMentions: Math.floor(Math.random() * 1000), // Would come from social APIs
      trendingScore: 0, // Set externally for trending tokens
      narrativeMatch: matchedKeyword ? 50 : 20,
    };

    relevanceScore += marketMetrics.liquidityScore * 0.2;
    relevanceScore += marketMetrics.momentumScore * 0.3;
    relevanceScore += culturalAlignment.narrativeMatch * 0.4;

    return {
      token,
      relevanceScore: Math.round(relevanceScore),
      marketMetrics,
      culturalAlignment,
      reasoning: this.generateReasoning(token, matchedKeyword),
    };
  }

  private generateReasoning(token: TokenInfo, keyword: string): string {
    const reasons: string[] = [];
    
    if (keyword && (token.name.toLowerCase().includes(keyword.toLowerCase()) || 
                   token.symbol.toLowerCase().includes(keyword.toLowerCase()))) {
      reasons.push(`Direct match with keyword "${keyword}"`);
    }
    
    if (token.priceChangePercent24h > 5) {
      reasons.push(`Strong upward momentum (+${token.priceChangePercent24h.toFixed(1)}%)`);
    }
    
    if (token.volume24h > 10000000) {
      reasons.push('High trading volume indicates strong interest');
    }
    
    if (token.marketCap > 100000000) {
      reasons.push('Established market presence');
    }
    
    return reasons.length > 0 ? reasons.join('. ') : 'General market correlation detected';
  }

  private removeDuplicateMatches(matches: CoinGeckoAssetMatch[]): CoinGeckoAssetMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      if (seen.has(match.token.id)) {
        return false;
      }
      seen.add(match.token.id);
      return true;
    });
  }
}