export const prerender = false;

import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { requireDatabaseUrl, getClientIp, jsonResponse, jsonError } from '../../../lib/api-helpers';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;
const LOCKOUT_THRESHOLD = 20;
const LOCKOUT_DURATION = 15 * 60_000;
const ipHits = new Map<string, { count: number; reset: number; lockedUntil: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (entry && now < entry.lockedUntil) return true;

  if (!entry || now > entry.reset) {
    ipHits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW, lockedUntil: 0 });
    return false;
  }

  entry.count++;
  if (entry.count > LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_DURATION;
    return true;
  }
  return entry.count > RATE_LIMIT_MAX;
}

function requireAdmin(request: Request): Response | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return jsonError('Admin not configured.', 503);

  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !timingSafeEqual(token, secret)) {
    return jsonError('Unauthorized.', 401);
  }
  return null;
}

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(clientAddress, request);
  if (isRateLimited(ip)) {
    return jsonError('Too many requests.', 429);
  }
  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const authGuard = requireAdmin(request);
  if (authGuard) return authGuard;

  const sql = neon(process.env.DATABASE_URL ?? '');
  const rows = await sql`
    SELECT id, tool_slug, author_name, content, approved, created_at
    FROM comments ORDER BY created_at DESC LIMIT 100
  `;

  return jsonResponse(rows);
};

export const PATCH: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(clientAddress, request);
  if (isRateLimited(ip)) {
    return jsonError('Too many requests.', 429);
  }

  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const authGuard = requireAdmin(request);
  if (authGuard) return authGuard;

  try {
    const body = await request.json();
    const { id, approved } = body;

    if (typeof id !== 'number' || typeof approved !== 'boolean') {
      return jsonError('id (number) and approved (boolean) are required.');
    }

    const sql = neon(process.env.DATABASE_URL ?? '');
    const result = await sql`
      UPDATE comments SET approved = ${approved} WHERE id = ${id} RETURNING id, approved
    `;

    if (result.length === 0) {
      return jsonError('Comment not found.', 404);
    }

    return jsonResponse(result[0]);
  } catch {
    return jsonError('Invalid request body.');
  }
};

export const DELETE: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(clientAddress, request);
  if (isRateLimited(ip)) {
    return jsonError('Too many requests.', 429);
  }

  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const authGuard = requireAdmin(request);
  if (authGuard) return authGuard;

  try {
    const body = await request.json();
    const { id } = body;

    if (typeof id !== 'number') {
      return jsonError('id (number) is required.');
    }

    const sql = neon(process.env.DATABASE_URL ?? '');
    const result = await sql`DELETE FROM comments WHERE id = ${id} RETURNING id`;

    if (result.length === 0) {
      return jsonError('Comment not found.', 404);
    }

    return jsonResponse({ deleted: true, id });
  } catch {
    return jsonError('Invalid request body.');
  }
};
