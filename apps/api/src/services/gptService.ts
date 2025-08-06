import { BaseService } from './base';
import { config } from '@/config/environment';
import { cacheService, CacheKeys } from './cacheService';
import { AzureOpenAI } from 'openai';

export interface ThemeExpansion {
  originalTheme: string;
  expandedKeywords: string[];
  categories: string[];
  culturalContext: {
    description: string;
    demographics: string[];
    platforms: string[];
    timeframe: string;
  };
  relatedTrends: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface GPTRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface GPTResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export class GPTService extends BaseService {
  private azureClient: AzureOpenAI | null = null;
  
  constructor() {
    const headers: Record<string, string> = {};
    
    // Fallback to regular OpenAI setup
    if (config.ai.openai.apiKey) {
      headers['Authorization'] = `Bearer ${config.ai.openai.apiKey}`;
    }

    super(config.ai.openai.baseURL, 'GPTService', headers);
    
    // Initialize Azure OpenAI client after super() call
    if (config.ai.azure.apiKey && config.ai.azure.endpoint) {
      try {
        this.azureClient = new AzureOpenAI({
          apiKey: config.ai.azure.apiKey,
          endpoint: config.ai.azure.endpoint,
          apiVersion: config.ai.azure.apiVersion,
          deployment: config.ai.azure.deployment,
        });
      } catch (error) {
        console.error('Failed to initialize Azure OpenAI client:', error);
      }
    }
  }

  async expandTheme(theme: string, useCache: boolean = true): Promise<ThemeExpansion> {
    const cacheKey = CacheKeys.themeExpansion(theme);
    
    if (useCache) {
      const cached = cacheService.get<ThemeExpansion>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const prompt = this.buildThemeExpansionPrompt(theme);
    
    const response = await this.makeGPTRequest({
      prompt,
      maxTokens: this.azureClient ? config.ai.azure.maxTokens : config.ai.openai.maxTokens,
      temperature: 0.7,
    });

    const expansion = this.parseThemeExpansionResponse(theme, response.content);
    
    if (useCache) {
      cacheService.set(cacheKey, expansion, 'medium');
    }

    return expansion;
  }

  async generateCulturalAnalysis(
    keywords: string[],
    context: string = ''
  ): Promise<{
    analysis: string;
    culturalSignificance: number;
    trendPotential: number;
    riskFactors: string[];
    opportunities: string[];
  }> {
    const prompt = this.buildCulturalAnalysisPrompt(keywords, context);
    
    const response = await this.makeGPTRequest({
      prompt,
      maxTokens: 2000,
      temperature: 0.5,
    });

    return this.parseCulturalAnalysisResponse(response.content);
  }

  async summarizeAssetOpportunities(
    assets: any[],
    culturalTheme: string
  ): Promise<{
    summary: string;
    topOpportunities: Array<{
      asset: string;
      reasoning: string;
      score: number;
    }>;
    marketTiming: string;
    riskAssessment: string;
  }> {
    const prompt = this.buildAssetSummaryPrompt(assets, culturalTheme);
    
    const response = await this.makeGPTRequest({
      prompt,
      maxTokens: 1500,
      temperature: 0.4,
    });

    return this.parseAssetSummaryResponse(response.content);
  }

  private async makeGPTRequest(request: GPTRequest): Promise<GPTResponse> {
    // Try Azure OpenAI first if available
    if (this.azureClient && config.ai.azure.apiKey && config.ai.azure.endpoint) {
      try {
        // Azure OpenAI o4-mini only supports temperature = 1.0
        const azureRequestParams: any = {
          model: config.ai.azure.model,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ],
          max_completion_tokens: request.maxTokens || config.ai.azure.maxTokens,
          temperature: 1.0, // o4-mini only supports temperature=1.0
        };

        // Warn if a different temperature was requested
        if (request.temperature && request.temperature !== 1.0) {
          console.warn(`Azure OpenAI o4-mini only supports temperature=1.0, ignoring requested temperature=${request.temperature}`);
        }

        const response = await this.azureClient.chat.completions.create(azureRequestParams);

        const choice = response.choices?.[0];
        if (!choice) {
          throw new Error('No response from Azure OpenAI API');
        }

        return {
          content: choice.message?.content || '',
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          finishReason: choice.finish_reason || 'unknown',
        };
      } catch (azureError) {
        console.error('Azure OpenAI API error, falling back to regular OpenAI:', azureError);
        
        // Fall through to regular OpenAI if Azure fails
      }
    }

    // Fallback to regular OpenAI
    if (!config.ai.openai.apiKey) {
      throw new Error('Neither Azure OpenAI nor regular OpenAI API key is configured');
    }

    const response = await this.makeRequest({
      method: 'POST',
      url: '/chat/completions',
      data: {
        model: request.model || config.ai.openai.model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || config.ai.openai.maxTokens,
        temperature: request.temperature || 0.7,
      },
    });

    const choice = (response.data as any).choices?.[0];
    if (!choice) {
      throw new Error('No response from OpenAI API');
    }

    return {
      content: choice.message.content,
      usage: (response.data as any).usage,
      finishReason: choice.finish_reason,
    };
  }

  private buildThemeExpansionPrompt(theme: string): string {
    return `
You are a cultural trend analyst specializing in web3 and digital culture. Analyze the following cultural theme/vibe and provide a comprehensive expansion.

Theme: "${theme}"

Please provide a JSON response with the following structure:
{
  "expandedKeywords": ["array", "of", "related", "keywords"],
  "categories": ["cultural", "categories"],
  "culturalContext": {
    "description": "detailed description of the cultural phenomenon",
    "demographics": ["target", "demographics"],
    "platforms": ["social", "platforms", "where", "this", "trends"],
    "timeframe": "estimated timeframe for this trend"
  },
  "relatedTrends": ["related", "cultural", "trends"],
  "sentiment": "positive|negative|neutral",
  "confidence": 0.85
}

Focus on:
- Web3/crypto/NFT relevance
- Social media presence
- Cultural significance
- Demographic appeal
- Market timing

Respond with valid JSON only.
    `.trim();
  }

  private buildCulturalAnalysisPrompt(keywords: string[], context: string): string {
    return `
Analyze the cultural significance and trend potential of these elements:

Keywords: ${keywords.join(', ')}
Context: ${context}

Provide analysis covering:
1. Cultural significance (0-100 score)
2. Trend potential (0-100 score)  
3. Risk factors
4. Market opportunities

Respond with JSON:
{
  "analysis": "detailed cultural analysis",
  "culturalSignificance": 85,
  "trendPotential": 70,
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"]
}
    `.trim();
  }

  private buildAssetSummaryPrompt(assets: any[], culturalTheme: string): string {
    return `
Analyze these crypto/NFT assets in relation to the cultural theme "${culturalTheme}":

Assets: ${JSON.stringify(assets, null, 2)}

Provide:
1. Executive summary
2. Top 3 opportunities with reasoning and scores (0-100)
3. Market timing assessment
4. Risk assessment

Respond with JSON:
{
  "summary": "executive summary",
  "topOpportunities": [
    {"asset": "name", "reasoning": "why", "score": 85}
  ],
  "marketTiming": "timing assessment",
  "riskAssessment": "risk analysis"
}
    `.trim();
  }

  private parseThemeExpansionResponse(originalTheme: string, content: string): ThemeExpansion {
    try {
      const parsed = JSON.parse(content);
      return {
        originalTheme,
        expandedKeywords: parsed.expandedKeywords || [],
        categories: parsed.categories || [],
        culturalContext: parsed.culturalContext || {
          description: '',
          demographics: [],
          platforms: [],
          timeframe: 'unknown'
        },
        relatedTrends: parsed.relatedTrends || [],
        sentiment: parsed.sentiment || 'neutral',
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      // Fallback parsing if JSON is malformed
      return {
        originalTheme,
        expandedKeywords: [originalTheme],
        categories: ['general'],
        culturalContext: {
          description: 'AI analysis failed - using fallback',
          demographics: [],
          platforms: [],
          timeframe: 'unknown'
        },
        relatedTrends: [],
        sentiment: 'neutral',
        confidence: 0.3,
      };
    }
  }

  private parseCulturalAnalysisResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        analysis: 'Analysis failed - could not parse response',
        culturalSignificance: 50,
        trendPotential: 50,
        riskFactors: ['Analysis error'],
        opportunities: [],
      };
    }
  }

  private parseAssetSummaryResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      return {
        summary: 'Summary generation failed',
        topOpportunities: [],
        marketTiming: 'Unknown',
        riskAssessment: 'Analysis error occurred',
      };
    }
  }
}