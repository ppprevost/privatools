export type { BlogPost } from '@/domain/entities';
export { getAllPosts, getPostBySlug, getPostsByTool } from '@/infra/blog.repo';

export function hasDatabaseUrl(): boolean {
  return !!process.env.DATABASE_URL;
}
