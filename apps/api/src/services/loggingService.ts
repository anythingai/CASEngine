import { config } from '@/config/environment';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  stack?: string;
}

export interface LogContext {
  service?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

export class LoggingService {
  private static instance: LoggingService;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = config.logLevel as LogLevel;
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    return levels[level] <= levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, service, userId, requestId, duration, metadata, stack } = entry;
    
    let logMessage = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (service) logMessage += ` [${service}]`;
    if (requestId) logMessage += ` [${requestId}]`;
    if (userId) logMessage += ` [user:${userId}]`;
    if (duration !== undefined) logMessage += ` [${duration}ms]`;
    
    logMessage += ` ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      logMessage += ` | ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      logMessage += `\nStack trace:\n${stack}`;
    }
    
    return logMessage;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;
    
    const formattedLog = this.formatLog(entry);
    
    // In production, you might want to use a proper logging library like Winston
    // or send logs to an external service like CloudWatch, DataDog, etc.
    switch (entry.level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'info':
        console.info(formattedLog);
        break;
      case 'debug':
        console.debug(formattedLog);
        break;
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      const { service, userId, requestId, duration, ...metadata } = context;
      if (service) entry.service = service;
      if (userId) entry.userId = userId;
      if (requestId) entry.requestId = requestId;
      if (duration !== undefined) entry.duration = duration;
      if (Object.keys(metadata).length > 0) entry.metadata = metadata;
    }

    if (error) {
      entry.stack = error.stack || '';
    }

    return entry;
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.writeLog(entry);
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('warn', message, context);
    this.writeLog(entry);
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('info', message, context);
    this.writeLog(entry);
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('debug', message, context);
    this.writeLog(entry);
  }

  // Request-specific logging methods
  logRequest(method: string, url: string, context?: LogContext): void {
    this.info(`${method} ${url}`, {
      ...context,
      type: 'request',
    });
  }

  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`${method} ${url} ${statusCode}`, {
      ...context,
      statusCode,
      duration,
      type: 'response',
    });
  }

  // Service-specific logging methods
  logServiceCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    context?: LogContext
  ): void {
    const level = success ? 'info' : 'error';
    this[level](`Service call: ${service}.${operation}`, {
      ...context,
      service,
      operation,
      duration,
      success,
      type: 'service_call',
    });
  }

  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    context?: LogContext
  ): void {
    this.debug(`Cache ${operation}: ${key}`, {
      ...context,
      operation,
      key,
      type: 'cache',
    });
  }

  // Performance logging
  logPerformance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug';
    this[level](`Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      duration,
      type: 'performance',
    });
  }

  // API Pipeline logging
  logPipelineStep(
    step: string,
    vibe: string,
    duration: number,
    success: boolean,
    context?: LogContext
  ): void {
    const level = success ? 'info' : 'error';
    this[level](`Pipeline step: ${step}`, {
      ...context,
      step,
      vibe,
      duration,
      success,
      type: 'pipeline',
    });
  }

  // Rate limiting logging
  logRateLimit(
    identifier: string,
    limit: number,
    current: number,
    context?: LogContext
  ): void {
    const level = current >= limit ? 'warn' : 'debug';
    this[level](`Rate limit check: ${identifier} (${current}/${limit})`, {
      ...context,
      identifier,
      limit,
      current,
      type: 'rate_limit',
    });
  }

  // Security logging
  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this[level](`Security event: ${event}`, {
      ...context,
      event,
      severity,
      type: 'security',
    });
  }

  // API Key usage logging
  logApiKeyUsage(
    service: string,
    success: boolean,
    rateLimited: boolean,
    context?: LogContext
  ): void {
    let message = `API key usage: ${service}`;
    let level: LogLevel = 'info';

    if (rateLimited) {
      message += ' (rate limited)';
      level = 'warn';
    } else if (!success) {
      message += ' (failed)';
      level = 'error';
    }

    this[level](message, {
      ...context,
      service,
      success,
      rateLimited,
      type: 'api_key_usage',
    });
  }

  // Health check logging
  logHealthCheck(
    service: string,
    healthy: boolean,
    responseTime?: number,
    context?: LogContext
  ): void {
    const level = healthy ? 'info' : 'error';
    let message = `Health check: ${service} ${healthy ? 'healthy' : 'unhealthy'}`;
    if (responseTime !== undefined) {
      message += ` (${responseTime}ms)`;
    }

    this[level](message, {
      ...context,
      service,
      healthy,
      responseTime,
      type: 'health_check',
    });
  }

  // Business logic logging
  logBusinessEvent(
    event: string,
    data: Record<string, any>,
    context?: LogContext
  ): void {
    this.info(`Business event: ${event}`, {
      ...context,
      event,
      data,
      type: 'business',
    });
  }

  // Utility method for creating child loggers with default context
  createContextLogger(defaultContext: LogContext) {
    const self = this;
    return {
      error: (message: string, context?: LogContext, error?: Error) =>
        self.error(message, { ...defaultContext, ...context }, error),
      warn: (message: string, context?: LogContext) =>
        self.warn(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        self.info(message, { ...defaultContext, ...context }),
      debug: (message: string, context?: LogContext) =>
        self.debug(message, { ...defaultContext, ...context }),
    };
  }

  // Batch logging for multiple entries
  logBatch(entries: LogEntry[]): void {
    entries.forEach(entry => this.writeLog(entry));
  }

  // Get current log level
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${level}`);
  }
}

// Export singleton instance
export const logger = LoggingService.getInstance();

// Request ID generator for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Express middleware for request logging
export function requestLoggingMiddleware(req: any, res: any, next: any) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Attach request ID to request object
  req.requestId = requestId;

  // Log incoming request
  logger.logRequest(req.method, req.originalUrl, {
    requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    const duration = Date.now() - startTime;
    logger.logResponse(req.method, req.originalUrl, res.statusCode, duration, {
      requestId,
      responseSize: JSON.stringify(data).length,
    });
    return originalJson(data);
  };

  next();
}

// Performance monitoring decorator
export function logPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function(...args: any[]) {
    const startTime = Date.now();
    const serviceName = target.constructor.name;
    
    try {
      const result = await method.apply(this, args);
      const duration = Date.now() - startTime;
      
      logger.logServiceCall(serviceName, propertyName, duration, true, {
        args: args.length,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logServiceCall(serviceName, propertyName, duration, false, {
        args: args.length,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };

  return descriptor;
}