// Utility types for handling external API responses and common patterns

// Generic API response types
export type ApiResponse<T = unknown> = {
  data?: T;
  [key: string]: unknown;
};

export type ExternalApiData = Record<string, unknown>;

// Error handling utilities
export interface ErrorWithMessage {
  message: string;
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

// Google Trends API response types (lightweight interfaces)
export interface GoogleTrendsData {
  default?: {
    timelineData?: Array<{
      time?: string;
      formattedTime?: string;
      formattedAxisTime?: string;
      value?: number[];
      formattedValue?: string[];
    }>;
  };
}

// Farcaster API types
export interface FarcasterApiCast {
  hash?: string;
  text?: string;
  timestamp?: string;
  author?: {
    username?: string;
    display_name?: string;
    fid?: number;
    pfp_url?: string;
    follower_count?: number;
    following_count?: number;
    [key: string]: unknown;
  };
  reactions?: {
    likes?: number;
    recasts?: number;
    [key: string]: unknown;
  };
  replies?: {
    count?: number;
    [key: string]: unknown;
  };
  embeds?: Array<{
    type?: string;
    url?: string;
    metadata?: ExternalApiData;
    [key: string]: unknown;
  }>;
  mentions?: string[];
  parent_author?: {
    username?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// CoinGecko API types
export interface CoinGeckoTokenData {
  id?: string;
  name?: string;
  symbol?: string;
  description?: {
    en?: string;
    [key: string]: unknown;
  };
  market_data?: {
    current_price?: { usd?: number; [key: string]: unknown };
    price_change_24h?: number;
    price_change_percentage_24h?: number;
    total_volume?: { usd?: number; [key: string]: unknown };
    market_cap?: { usd?: number; [key: string]: unknown };
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: number;
    [key: string]: unknown;
  };
  categories?: string[];
  genesis_date?: string;
  links?: {
    homepage?: string[];
    twitter_screen_name?: string;
    [key: string]: unknown;
  };
  image?: {
    thumb?: string;
    small?: string;
    large?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// OpenSea API types
export interface OpenSeaCollectionData {
  collection?: string;
  slug?: string;
  name?: string;
  description?: string;
  image_url?: string;
  featured_image_url?: string;
  banner_image_url?: string;
  external_url?: string;
  discord_url?: string;
  twitter_username?: string;
  instagram_username?: string;
  created_date?: string;
  safelist_request_status?: string;
  primary_asset_contracts?: Array<{
    address?: string;
    chain?: string;
    asset_contract_type?: string;
    [key: string]: unknown;
  }>;
  contracts?: Array<{
    address?: string;
    [key: string]: unknown;
  }>;
  stats?: {
    total_supply?: number;
    floor_price?: number;
    floor_price_symbol?: string;
    total_volume?: number;
    one_day_volume?: number;
    one_day_change?: number;
    one_day_average_price?: number;
    one_day_sales?: number;
    num_owners?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface OpenSeaStatsData {
  total_volume?: number;
  total_sales?: number;
  total_supply?: number;
  count?: number;
  num_owners?: number;
  average_price?: number;
  num_reports?: number;
  market_cap?: number;
  floor_price?: number;
  floor_price_symbol?: string;
  one_day_volume?: number;
  seven_day_volume?: number;
  thirty_day_volume?: number;
  one_day_change?: number;
  seven_day_change?: number;
  thirty_day_change?: number;
  [key: string]: unknown;
}

export interface OpenSeaNftData {
  identifier?: string;
  token_id?: string;
  name?: string;
  description?: string;
  image_url?: string;
  display_image_url?: string;
  collection?: string;
  collection_name?: string;
  contract?: string;
  traits?: Array<{
    trait_type?: string;
    value?: string;
    display_type?: string;
    [key: string]: unknown;
  }>;
  owner?: string;
  permalink?: string;
  last_sale?: {
    total_price?: string;
    payment_token?: {
      symbol?: string;
      [key: string]: unknown;
    };
    event_timestamp?: string;
    [key: string]: unknown;
  };
  orders?: Array<{
    current_price?: string;
    payment_token_contract?: {
      symbol?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  rarity?: {
    rank?: number;
    score?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Generic dynamic data types
export type DynamicParams = Record<string, string | number | boolean>;
export type SocialMetrics = Record<string, unknown>;
export type TasteProfile = Record<string, unknown>;