/**
 * ========================================
 * RATE LIMITER
 * ========================================
 *
 * Simple in-memory rate limiter voor Vercel Edge.
 * Voor production met hoge load: gebruik Upstash Redis.
 *
 * Gebruik:
 * - Chat API: 10 requests per minuut
 * - Upload API: 5 requests per uur
 * - Admin API: 30 requests per minuut
 * - Portal API: 20 requests per minuut
 */

// ========================================
// TYPES
// ========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  windowMs: number;      // Time window in ms
  maxRequests: number;   // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

// ========================================
// CONFIGURATION
// ========================================

export const RATE_LIMITS = {
  chat: { windowMs: 60_000, maxRequests: 10 },        // 10/min
  upload: { windowMs: 3600_000, maxRequests: 5 },     // 5/hour
  admin: { windowMs: 60_000, maxRequests: 30 },       // 30/min
  portal: { windowMs: 60_000, maxRequests: 20 },      // 20/min
  feedback: { windowMs: 60_000, maxRequests: 5 },     // 5/min
} as const;

// ========================================
// IN-MEMORY STORE
// ========================================

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup oude entries elke 5 minuten
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries(): void {
  const now = Date.now();

  // Alleen cleanup als interval verstreken is
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// ========================================
// RATE LIMIT FUNCTIONS
// ========================================

/**
 * Check of een request is toegestaan binnen de rate limit.
 *
 * @param key - Unieke identifier voor de rate limit bucket
 * @param config - Rate limit configuratie
 * @returns Object met allowed status, remaining requests, en reset time
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();

  // Cleanup oude entries periodiek
  cleanupOldEntries();

  const entry = rateLimitStore.get(key);

  // Reset als window verstreken is
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  // Eerste request in dit window
  if (!current) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }

  // Check of limit bereikt is
  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: current.resetTime - now
    };
  }

  // Increment counter
  current.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetIn: current.resetTime - now
  };
}

/**
 * Genereer een rate limit key voor een request.
 *
 * @param tenantId - Tenant identifier (of null)
 * @param ip - Client IP address
 * @param endpoint - API endpoint naam
 * @returns Samengestelde key voor rate limiting
 */
export function getRateLimitKey(
  tenantId: string | null,
  ip: string,
  endpoint: string
): string {
  return `${endpoint}:${tenantId || 'anonymous'}:${ip}`;
}

/**
 * Haal client IP uit request headers.
 * Werkt met Vercel, Cloudflare, en direct requests.
 */
export function getClientIp(request: Request): string {
  // Vercel/algemene proxy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnecting = request.headers.get('cf-connecting-ip');
  if (cfConnecting) {
    return cfConnecting;
  }

  // Direct connection (development)
  return 'unknown';
}
