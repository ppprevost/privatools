import { sql } from './neon';
import type { Comment, PublicComment } from '@/domain/entities';

export async function getApprovedComments(toolSlug: string): Promise<PublicComment[]> {
  const rows = await sql()`
    SELECT id, author_name, content, created_at
    FROM comments
    WHERE tool_slug = ${toolSlug} AND approved = true
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows as PublicComment[];
}

export async function countRecentByIp(ipHash: string): Promise<number> {
  const rows = await sql()`
    SELECT COUNT(*)::int AS cnt FROM comments
    WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'
  `;
  return rows[0].cnt;
}

export async function insertComment(toolSlug: string, name: string, content: string, ipHash: string): Promise<void> {
  await sql()`
    INSERT INTO comments (tool_slug, author_name, content, ip_hash)
    VALUES (${toolSlug}, ${name}, ${content}, ${ipHash})
  `;
}

export async function getAllComments(): Promise<Comment[]> {
  const rows = await sql()`
    SELECT id, tool_slug, author_name, content, approved, created_at
    FROM comments ORDER BY created_at DESC LIMIT 100
  `;
  return rows as Comment[];
}

export async function setCommentApproval(id: number, approved: boolean): Promise<Comment | null> {
  const rows = await sql()`
    UPDATE comments SET approved = ${approved} WHERE id = ${id} RETURNING id, approved
  `;
  return (rows[0] as Comment) ?? null;
}

export async function deleteComment(id: number): Promise<boolean> {
  const rows = await sql()`DELETE FROM comments WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
