export const prerender = false;

import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { tools } from '../../lib/tools-config';
import { requireDatabaseUrl, requireOrigin, getClientIp, jsonResponse, jsonError } from '../../lib/api-helpers';

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = await res.json();
  return data.success === true;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const originGuard = requireOrigin(request);
  if (originGuard) return originGuard;

  try {
    const body = await request.json();
    const { toolSlug, authorName, content, turnstileToken, website } = body;

    if (website) {
      return jsonResponse({ success: true });
    }

    if (!toolSlug || !tools[toolSlug]) {
      return jsonError('Invalid tool.');
    }

    const trimmedName = authorName?.trim() || '';
    const trimmedContent = content?.trim() || '';

    if (trimmedName.length < 3 || trimmedName.length > 100) {
      return jsonError('Name must be between 3 and 100 characters.');
    }

    if (trimmedContent.length < 10 || trimmedContent.length > 2000) {
      return jsonError('Comment must be between 10 and 2000 characters.');
    }

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return jsonError('Captcha verification failed.', 403);
    }

    const ip = getClientIp(clientAddress, request);
    const ipHash = await hashIP(ip);

    const sql = neon(process.env.DATABASE_URL ?? '');

    const rateCheck = await sql`
      SELECT COUNT(*)::int AS cnt FROM comments
      WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
    `;
    if (rateCheck[0].cnt >= 3) {
      return jsonError('Too many comments. Please try again later.', 429);
    }

    await sql`
      INSERT INTO comments (tool_slug, author_name, content, ip_hash)
      VALUES (${toolSlug}, ${trimmedName}, ${trimmedContent}, ${ipHash})
    `;

    return jsonResponse({ success: true }, 201);
  } catch (e) {
    console.error('Comment submission error:', (e as Error).message);
    return jsonError('Something went wrong. Please try again.', 500);
  }
};
