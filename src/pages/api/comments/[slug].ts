export const prerender = false;

import type { APIRoute } from 'astro';
import { neon } from '@neondatabase/serverless';
import { tools } from '../../../lib/tools-config';
import { requireDatabaseUrl, jsonResponse, jsonError } from '../../../lib/api-helpers';

export const GET: APIRoute = async ({ params }) => {
  const dbGuard = requireDatabaseUrl();
  if (dbGuard) return dbGuard;

  const { slug } = params;

  if (!slug || !tools[slug]) {
    return jsonError('Invalid tool.');
  }

  try {
    const sql = neon(process.env.DATABASE_URL ?? '');

    const rows = await sql`
      SELECT id, author_name, content, created_at
      FROM comments
      WHERE tool_slug = ${slug} AND approved = true
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return jsonResponse(rows);
  } catch (e) {
    console.error('Comments fetch error:', (e as Error).message);
    return jsonError('Something went wrong.', 500);
  }
};
