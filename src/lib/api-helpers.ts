export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const ALLOWED_ORIGINS = ['https://priva.tools', 'https://privatools.com', 'http://localhost:4321'];

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export function jsonError(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS });
}

export function requireDatabaseUrl(): Response | null {
  if (!process.env.DATABASE_URL) {
    return jsonError('Service unavailable: DATABASE_URL is not configured.', 503);
  }
  return null;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function isMobileClient(request: Request): boolean {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey || !process.env.MOBILE_API_KEY) return false;
  return timingSafeEqual(apiKey, process.env.MOBILE_API_KEY);
}

export function requireAuth(request: Request): Response | null {
  if (isMobileClient(request)) return null;

  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    return jsonError('Forbidden.', 403);
  }
  return null;
}

export function getClientIp(clientAddress: string | undefined, request: Request): string {
  return clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
}

const ERROR_STATUS_MAP: Record<string, number> = {
  ValidationError: 400,
  CaptchaError: 403,
  AuthError: 401,
  NotFoundError: 404,
  RateLimitError: 429,
};

export function handleUseCaseError(e: unknown): Response {
  if (e instanceof Error && e.name in ERROR_STATUS_MAP) {
    return jsonError(e.message, ERROR_STATUS_MAP[e.name]);
  }
  console.error('Unexpected error:', (e as Error).message);
  return jsonError('Something went wrong. Please try again.', 500);
}

type RateLimitEntry = {
  count: number;
  reset: number;
  lockedUntil: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  lockoutThreshold?: number;
  lockoutDurationMs?: number;
};

export function createRateLimiter({ windowMs, max, lockoutThreshold, lockoutDurationMs }: RateLimitOptions) {
  const hits = new Map<string, RateLimitEntry>();

  return (ip: string): boolean => {
    const now = Date.now();
    const entry = hits.get(ip);

    if (entry && now < entry.lockedUntil) return true;

    if (!entry || now > entry.reset) {
      hits.set(ip, { count: 1, reset: now + windowMs, lockedUntil: 0 });
      return false;
    }

    entry.count++;
    if (lockoutThreshold && lockoutDurationMs && entry.count > lockoutThreshold) {
      entry.lockedUntil = now + lockoutDurationMs;
      return true;
    }
    return entry.count > max;
  };
}
