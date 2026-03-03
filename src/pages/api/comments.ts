export const prerender = false;

import type { APIRoute } from 'astro';
import { requireDatabaseUrl, requireAuth, isMobileClient, getClientIp, jsonResponse, handleUseCaseError } from '../../lib/api-helpers';
import { submitComment } from '@/use-cases/submit-comment';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const authGuard = requireAuth(request);
  if (authGuard) return authGuard;

  try {
    const body = await request.json();
    const { toolSlug, authorName, content, turnstileToken, website } = body;

    await submitComment({
      toolSlug,
      authorName,
      content,
      turnstileToken,
      website,
      ip: getClientIp(clientAddress, request),
      isMobile: isMobileClient(request),
    });

    return jsonResponse({ success: true }, 201);
  } catch (e) {
    return handleUseCaseError(e);
  }
};
