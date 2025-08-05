import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().min(1, 'ID is required');

export const emailSchema = z.string().email('Invalid email format');

export const urlSchema = z.string().url('Invalid URL format');

export const dateSchema = z.union([
  z.string().datetime(),
  z.date(),
]).transform((val) => typeof val === 'string' ? new Date(val) : val);

// Score validation (0-100)
export const scoreSchema = z.number().min(0).max(100);

// Confidence validation (0-1)
export const confidenceSchema = z.number().min(0).max(1);

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Utility functions
export const isValidAddress = (address: string): boolean => {
  // Basic Ethereum address validation
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidSymbol = (symbol: string): boolean => {
  // Basic crypto symbol validation
  return /^[A-Z]{1,10}$/.test(symbol);
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};