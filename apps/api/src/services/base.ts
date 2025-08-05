import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '@/config/environment';

export interface ServiceError extends Error {
  statusCode: number;
  service: string;
  originalError?: any;
}

export class BaseServiceError extends Error implements ServiceError {
  constructor(
    message: string,
    public statusCode: number,
    public service: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export abstract class BaseService {
  protected client: AxiosInstance;
  protected serviceName: string;

  constructor(baseURL: string, serviceName: string, defaultHeaders: Record<string, string> = {}) {
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cultural-Arbitrage-Signal-Engine/1.0.0',
        ...defaultHeaders,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if ((config as any).nodeEnv === 'development') {
          console.log(`[${this.serviceName}] Request:`, {
            method: config.method?.toUpperCase(),
            url: config.url,
            params: config.params,
          });
        }
        return config;
      },
      (error) => {
        console.error(`[${this.serviceName}] Request Error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (config.nodeEnv === 'development') {
          console.log(`[${this.serviceName}] Response:`, {
            status: response.status,
            url: response.config.url,
          });
        }
        return response;
      },
      (error) => {
        console.error(`[${this.serviceName}] Response Error:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          data: error.response?.data,
        });
        
        throw new BaseServiceError(
          error.response?.data?.message || error.message || 'Service request failed',
          error.response?.status || 500,
          this.serviceName,
          error
        );
      }
    );
  }

  protected async makeRequest<T>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.request<T>(config);
    } catch (error) {
      // Error is already handled by interceptor
      throw error;
    }
  }

  protected buildParams(params: Record<string, any>): Record<string, string> {
    const cleanParams: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    }
    
    return cleanParams;
  }
}

// Service health check interface
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length < this.maxRequests) {
      validRequests.push(now);
      this.requests.set(key, validRequests);
      return true;
    }
    
    return false;
  }

  getNextAvailableTime(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + this.windowMs;
  }
}