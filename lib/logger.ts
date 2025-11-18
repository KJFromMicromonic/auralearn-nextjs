/**
 * Secure Logger Utility
 * 
 * Provides secure logging that:
 * - Only logs in development mode (never in production)
 * - Sanitizes sensitive data (emails, IDs, tokens, keys, etc.)
 * - Prevents sensitive information from appearing in browser console
 * 
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * 
 * logger.log('User logged in'); // Only in dev
 * logger.error('Error:', error); // Sanitizes sensitive data
 * ```
 */

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development';
  }
  // In browser, check if we're in dev mode
  if (typeof window !== 'undefined') {
    // Check for development indicators
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('.local')
    );
  }
  return false;
}

/**
 * Patterns to identify and sanitize sensitive data
 */
const SENSITIVE_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // API keys (long alphanumeric strings)
  /\b[A-Za-z0-9]{32,}\b/g,
  // JWT tokens
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // Clerk IDs (format: user_xxxxx)
  /\buser_[A-Za-z0-9]{24,}\b/g,
  // UUIDs (but keep short IDs)
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // Supabase keys
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9._-]+/g,
];

/**
 * Sanitize a string by replacing sensitive patterns
 */
function sanitizeString(value: string): string {
  let sanitized = value;
  
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

/**
 * Sanitize an object recursively
 */
function sanitizeObject(obj: unknown, depth: number = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      stack: obj.stack ? sanitizeString(obj.stack) : undefined,
    };
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      'email',
      'clerk_id',
      'clerkId',
      'token',
      'key',
      'apiKey',
      'api_key',
      'secret',
      'password',
      'authorization',
      'auth',
      'access_token',
      'refresh_token',
      'session',
      'user_id',
      'userId',
      'student_id',
      'studentId',
      'teacher_id',
      'teacherId',
      'parent_email',
      'parent_email_2',
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Redact entire value for sensitive keys
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Sanitize arguments before logging
 */
function sanitizeArgs(...args: unknown[]): unknown[] {
  return args.map(arg => sanitizeObject(arg));
}

/**
 * Secure logger interface
 */
interface SecureLogger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Create secure logger instance
 */
function createSecureLogger(): SecureLogger {
  const isDev = isDevelopment();

  return {
    log: (...args: unknown[]) => {
      if (isDev) {
        console.log(...sanitizeArgs(...args));
      }
    },
    warn: (...args: unknown[]) => {
      if (isDev) {
        console.warn(...sanitizeArgs(...args));
      }
    },
    error: (...args: unknown[]) => {
      if (isDev) {
        console.error(...sanitizeArgs(...args));
      }
      // In production, errors should still be logged server-side
      // but not exposed to browser console
    },
    info: (...args: unknown[]) => {
      if (isDev) {
        console.info(...sanitizeArgs(...args));
      }
    },
    debug: (...args: unknown[]) => {
      if (isDev) {
        console.debug(...sanitizeArgs(...args));
      }
    },
  };
}

/**
 * Export singleton logger instance
 */
export const logger = createSecureLogger();

/**
 * Server-side logger for API routes
 * Logs to server console (not browser) and sanitizes sensitive data
 */
export const serverLogger = {
  log: (...args: unknown[]) => {
    if (isDevelopment()) {
      console.log('[SERVER]', ...sanitizeArgs(...args));
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment()) {
      console.warn('[SERVER]', ...sanitizeArgs(...args));
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors server-side, but sanitize them
    console.error('[SERVER]', ...sanitizeArgs(...args));
  },
  info: (...args: unknown[]) => {
    if (isDevelopment()) {
      console.info('[SERVER]', ...sanitizeArgs(...args));
    }
  },
};

