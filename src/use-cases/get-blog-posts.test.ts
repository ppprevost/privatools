import { describe, it, expect, vi } from 'vitest';
import { listPosts, getPost, getRelatedPosts } from './get-blog-posts';

vi.mock('@/infra/blog.repo', () => ({
  getAllPosts: vi.fn(),
  getPostBySlug: vi.fn(),
  getPostsByTool: vi.fn(),
}));

import * as blogRepo from '@/infra/blog.repo';

const mockPost = {
  slug: 'test-post',
  title: 'Test',
  description: 'A test post',
  content: '<p>Full content</p>',
  date: '2024-01-01',
  category: 'tips',
  related_tools: ['compress-pdf'],
  og_image: null,
};

describe('listPosts', () => {
  it('returns posts without content', async () => {
    vi.mocked(blogRepo.getAllPosts).mockResolvedValue([mockPost]);

    const result = await listPosts();
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('content');
    expect(result[0].title).toBe('Test');
  });
});

describe('getPost', () => {
  it('returns post by slug', async () => {
    vi.mocked(blogRepo.getPostBySlug).mockResolvedValue(mockPost);

    const result = await getPost('test-post');
    expect(result).toEqual(mockPost);
  });

  it('throws NotFoundError for missing slug', async () => {
    vi.mocked(blogRepo.getPostBySlug).mockResolvedValue(null);
    await expect(getPost('nonexistent'))
      .rejects.toThrow('Post not found.');
  });
});

describe('getRelatedPosts', () => {
  it('returns related posts by tool slug', async () => {
    vi.mocked(blogRepo.getPostsByTool).mockResolvedValue([mockPost]);

    const result = await getRelatedPosts('compress-pdf');
    expect(result).toEqual([mockPost]);
  });
});
