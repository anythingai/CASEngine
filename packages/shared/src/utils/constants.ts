// API Configuration
export const API_CONFIG = {
  VERSION: 'v1',
  BASE_PATH: '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Cultural categories
export const CULTURAL_CATEGORIES = [
  'art',
  'music',
  'fashion',
  'gaming',
  'memes',
  'lifestyle',
  'technology',
  'sports',
  'entertainment',
  'social',
] as const;

// Social platforms
export const SOCIAL_PLATFORMS = [
  'twitter',
  'instagram',
  'tiktok',
  'reddit',
  'discord',
  'telegram',
  'youtube',
  'twitch',
  'other',
] as const;

// Blockchains
export const BLOCKCHAINS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'solana',
  'avalanche',
  'bsc',
  'other',
] as const;

// Time constants
export const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Score ranges
export const SCORE_RANGES = {
  VIRALITY: { MIN: 0, MAX: 100 },
  MOMENTUM: { MIN: 0, MAX: 100 },
  CONFIDENCE: { MIN: 0, MAX: 1 },
  STRENGTH: { MIN: 0, MAX: 100 },
} as const;

// Risk levels
export const RISK_LEVELS = ['low', 'medium', 'high', 'extreme'] as const;

// Status options
export const STATUSES = ['active', 'inactive', 'pending', 'archived'] as const;

// Priority levels  
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;