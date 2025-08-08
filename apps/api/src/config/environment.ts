import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // AI/LLM Services
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Azure OpenAI Services
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  AZURE_OPENAI_DEPLOYMENT: z.string().default('o4-mini'),
  AZURE_OPENAI_API_VERSION: z.string().default('2025-01-01-preview'),
  
  // Qloo Taste AI
  QLOO_API_KEY: z.string().optional(),
  QLOO_API_URL: z.string().default('https://api.qloo.com'),
  
  // Crypto/NFT APIs
  COINGECKO_API_KEY: z.string().optional(),
  OPENSEA_API_KEY: z.string().optional(),
  
  // Social Media APIs (Google Trends is free and requires no API key)
  FARCASTER_API_KEY: z.string().optional(),
  
  // Cache Configuration
  CACHE_TTL_SHORT: z.string().transform(Number).default('300'), // 5 minutes
  CACHE_TTL_MEDIUM: z.string().transform(Number).default('1800'), // 30 minutes
  CACHE_TTL_LONG: z.string().transform(Number).default('3600'), // 1 hour
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Feature Flags
  ENABLE_RATE_LIMITING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_LOGGING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CORS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_COMPRESSION: z.string().transform(val => val === 'true').default('false'),
  SERVE_STATIC_FRONTEND: z.string().transform(val => val === 'true').default('false'),
  
  // Performance Configuration
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  REQUEST_TIMEOUT: z.string().transform(Number).default('30000'),
  
  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
};

const env = parseEnv();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  corsOrigins: env.CORS_ORIGINS.split(',').map((origin: string) => origin.trim()),
  apiKey: env.API_KEY,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwtSecret: env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  logLevel: env.LOG_LEVEL,
  frontend: {
    url: env.FRONTEND_URL,
    serveStatic: env.SERVE_STATIC_FRONTEND,
  },
  
  // AI/LLM Services
  ai: {
    openai: {
      apiKey: env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4-turbo-preview',
      maxTokens: 4000,
    },
    azure: {
      apiKey: env.AZURE_OPENAI_API_KEY,
      endpoint: env.AZURE_OPENAI_ENDPOINT,
      deployment: env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: env.AZURE_OPENAI_API_VERSION,
      model: 'o4-mini',
      maxTokens: 40000,
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4000,
    },
  },
  
  // Qloo Taste AI
  qloo: {
    apiKey: env.QLOO_API_KEY,
    baseURL: env.QLOO_API_URL,
    timeout: 10000,
  },
  
  // Crypto/NFT APIs
  coingecko: {
    apiKey: env.COINGECKO_API_KEY,
    baseURL: 'https://api.coingecko.com/api/v3',
    proBaseURL: 'https://pro-api.coingecko.com/api/v3',
    timeout: 10000,
  },
  
  opensea: {
    apiKey: env.OPENSEA_API_KEY,
    baseURL: 'https://api.opensea.io/api/v2',
    timeout: 10000,
  },
  
  // Social Media APIs
  social: {
    // Google Trends API - completely free, no configuration needed
    trends: {
      baseURL: 'https://trends.google.com',
      timeout: 10000,
    },
    farcaster: {
      apiKey: env.FARCASTER_API_KEY,
      baseURL: 'https://api.neynar.com/v2',
      timeout: 10000,
    },
    // Free Farcaster data sources
    farcasterFree: {
      // Public Warpcast API (free tier)
      warpcast: 'https://api.warpcast.com/v2',
      // Farcaster Hub (direct protocol access, free)
      hub: 'https://hub-api.neynar.com/v1',
      timeout: 10000,
    },
  },
  
  // Cache Configuration
  cache: {
    ttl: {
      short: env.CACHE_TTL_SHORT, // 5 minutes
      medium: env.CACHE_TTL_MEDIUM, // 30 minutes
      long: env.CACHE_TTL_LONG, // 1 hour
    },
    maxSize: 1000, // Maximum number of cached items
  },
  
  // Feature flags
  features: {
    rateLimiting: env.ENABLE_RATE_LIMITING,
    logging: env.ENABLE_LOGGING,
    cors: env.ENABLE_CORS,
    compression: env.ENABLE_COMPRESSION,
    caching: true,
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // API configuration
  api: {
    version: 'v1',
    baseUrl: '/api',
    timeout: env.REQUEST_TIMEOUT,
    maxRequestSize: env.MAX_REQUEST_SIZE,
  },
  
  // Health Check Configuration
  healthCheck: {
    interval: env.HEALTH_CHECK_INTERVAL,
  },
} as const;

// Type-safe configuration
export type Config = typeof config;