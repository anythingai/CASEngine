import { ApiResponse, PaginatedResponse } from './common';

// API endpoint types
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
}

export interface ApiInfo {
  message: string;
  version: string;
  status: string;
  timestamp: string;
  endpoints: Record<string, string>;
}

// Request/Response wrappers
export type ApiRequest<T = unknown> = {
  body?: T;
  query?: Record<string, string | string[]>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

export type ApiSuccessResponse<T = unknown> = ApiResponse<T> & {
  data: T;
  error?: never;
};

export type ApiErrorResponse = ApiResponse<never> & {
  data?: never;
  error: {
    message: string;
    statusCode: number;
    code?: string;
    details?: Record<string, unknown>;
  };
};

export type PaginatedApiResponse<T> = ApiSuccessResponse<PaginatedResponse<T>>;

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Status codes
export type HttpStatusCode = 
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500; // Internal Server Error