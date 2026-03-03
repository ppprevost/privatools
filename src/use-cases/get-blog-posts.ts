import { NotFoundError } from '@/domain/errors';
import * as blogRepo from '@/infra/blog.repo';
import type { BlogPost, BlogPostSummary } from '@/domain/entities';

export async function listPosts(): Promise<BlogPostSummary[]> {
  const posts = await blogRepo.getAllPosts();
  return posts.map(({ content: _, ...rest }) => rest);
}

export async function getPost(slug: string): Promise<BlogPost> {
  const post = await blogRepo.getPostBySlug(slug);
  if (!post) throw new NotFoundError('Post not found.');
  return post;
}

export async function getRelatedPosts(toolSlug: string): Promise<BlogPost[]> {
  return blogRepo.getPostsByTool(toolSlug);
}
