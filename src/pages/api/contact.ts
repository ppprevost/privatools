export const prerender = false;

import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { requireDatabaseUrl, requireAuth, getClientIp, verifyTurnstile, createRateLimiter, jsonResponse, jsonError } from '../../lib/api-helpers';

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_MESSAGE = 5000;

const isRateLimited = createRateLimiter({ windowMs: 60_000, max: 5 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const authGuard = requireAuth(request);
  if (authGuard) return authGuard;

  const ip = getClientIp(clientAddress, request);
  if (isRateLimited(ip)) {
    return jsonError('Too many requests. Please try again later.', 429);
  }

  try {
    const body = await request.json();
    const { name, email, message, turnstileToken } = body;

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return jsonError('Captcha verification failed.', 403);
    }

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return jsonError('All fields are required.');
    }

    if (name.trim().length > MAX_NAME || email.trim().length > MAX_EMAIL || message.trim().length > MAX_MESSAGE) {
      return jsonError('Input too long.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // eslint-disable-line sonarjs/slow-regex
    if (!emailRegex.test(email)) {
      return jsonError('Invalid email address.');
    }

    const sql = neon(process.env.DATABASE_URL ?? '');
    await sql`INSERT INTO contacts (name, email, message) VALUES (${name.trim()}, ${email.trim()}, ${message.trim()})`;

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('Contact form error:', (e as Error).message);
    return jsonError('Something went wrong. Please try again.', 500);
  }
};
