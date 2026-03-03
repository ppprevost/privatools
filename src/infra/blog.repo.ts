import { sql } from './neon';
import type { BlogPost } from '@/domain/entities';

export async function getAllPosts(): Promise<BlogPost[]> {
  const rows = await sql()`
    SELECT slug, title, description, content, date::text, category, related_tools, og_image
    FROM blog_posts
    ORDER BY date DESC
  `;
  return rows as BlogPost[];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const rows = await sql()`
    SELECT slug, title, description, content, date::text, category, related_tools, og_image
    FROM blog_posts
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return (rows[0] as BlogPost) ?? null;
}

export async function getPostsByTool(toolSlug: string): Promise<BlogPost[]> {
  try {
    const rows = await sql()`
      SELECT slug, title, description, content, date::text, category, related_tools, og_image
      FROM blog_posts
      WHERE ${toolSlug} = ANY(related_tools)
      ORDER BY date DESC
      LIMIT 3
    `;
    return rows as BlogPost[];
  } catch {
    return [];
  }
}
