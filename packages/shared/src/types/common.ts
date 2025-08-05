// Common types used across the application

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    count: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

export type Status = 'active' | 'inactive' | 'pending' | 'archived';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type Environment = 'development' | 'staging' | 'production' | 'test';

// Cultural categories for trend classification
export type CulturalCategory = 
  | 'art'
  | 'music' 
  | 'fashion'
  | 'gaming'
  | 'memes'
  | 'lifestyle'
  | 'technology'
  | 'sports'
  | 'entertainment'
  | 'social';

// Sentiment analysis results
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface SentimentScore {
  sentiment: Sentiment;
  confidence: number; // 0-1
  score: number; // -1 to 1
}