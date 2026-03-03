export const prerender = false;

import type { APIRoute } from 'astro';
import { requireDatabaseUrl, getClientIp, timingSafeEqual, createRateLimiter, jsonResponse, jsonError, handleUseCaseError } from '../../../lib/api-helpers';
import { listAllComments, approveComment, removeComment } from '@/use-cases/admin-comments';
import { ValidationError } from '@/domain/errors';

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

function guardAll(request: Request, clientAddress: string | undefined): Response | null {
  const ip = getClientIp(clientAddress, request);
  if (isRateLimited(ip)) return jsonError('Too many requests.', 429);

  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  return requireAdmin(request);
}

export const GET: APIRoute = async ({ request, clientAddress }) => {
  const guard = guardAll(request, clientAddress);
  if (guard) return guard;

  try {
    const rows = await listAllComments();
    return jsonResponse(rows);
  } catch (e) {
    return handleUseCaseError(e);
  }
};

export const PATCH: APIRoute = async ({ request, clientAddress }) => {
  const guard = guardAll(request, clientAddress);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { id, approved } = body;

    if (typeof id !== 'number' || typeof approved !== 'boolean') {
      throw new ValidationError('id (number) and approved (boolean) are required.');
    }

    const result = await approveComment(id, approved);
    return jsonResponse(result);
  } catch (e) {
    return handleUseCaseError(e);
  }
};

export const DELETE: APIRoute = async ({ request, clientAddress }) => {
  const guard = guardAll(request, clientAddress);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { id } = body;

    if (typeof id !== 'number') {
      throw new ValidationError('id (number) is required.');
    }

    await removeComment(id);
    return jsonResponse({ deleted: true, id });
  } catch (e) {
    return handleUseCaseError(e);
  }
};
