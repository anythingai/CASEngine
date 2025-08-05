import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '@/config/environment';

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  points: config.rateLimit.maxRequests, // Number of requests
  duration: Math.floor(config.rateLimit.windowMs / 1000), // Per duration in seconds
  blockDuration: Math.floor(config.rateLimit.windowMs / 1000), // Block duration in seconds
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!config.features.rateLimiting) {
      return next();
    }

    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rateLimiterRes: any) {
    // Rate limit exceeded
    const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
    
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: {
        message: 'Too many requests, please try again later',
        statusCode: 429,
        retryAfter: secs,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

// Export as default for easier import
export { rateLimiterMiddleware as rateLimiter };