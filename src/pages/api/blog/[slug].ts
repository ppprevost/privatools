export const prerender = false;

import type { APIRoute } from 'astro';
import { requireDatabaseUrl, requireAuth, jsonResponse, jsonError, handleUseCaseError } from '../../../lib/api-helpers';
import { getPost } from '@/use-cases/get-blog-posts';

export const GET: APIRoute = async ({ params, request }) => {
  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const authGuard = requireAuth(request);
  if (authGuard) return authGuard;

  const { slug } = params;
  if (!slug) return jsonError('Missing slug.');

  try {
    const post = await getPost(slug);
    return jsonResponse(post);
  } catch (e) {
    return handleUseCaseError(e);
  }
};
