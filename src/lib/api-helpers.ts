export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const ALLOWED_ORIGINS = ['https://privatools.com', 'http://localhost:4321'];

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

export function requireOrigin(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    return jsonError('Forbidden.', 403);
  }
  return null;
}

export function getClientIp(clientAddress: string | undefined, request: Request): string {
  return clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
}
