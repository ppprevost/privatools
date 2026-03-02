export const prerender = false;

import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { requireDatabaseUrl, getClientIp, timingSafeEqual, createRateLimiter, jsonResponse, jsonError } from '../../../lib/api-helpers';

const isRateLimited = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  lockoutThreshold: 20,
  lockoutDurationMs: 15 * 60_000,
});

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
