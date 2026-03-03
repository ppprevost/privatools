import { describe, it, expect, vi } from 'vitest';
import { listAllComments, approveComment, removeComment } from './admin-comments';

vi.mock('@/infra/comment.repo', () => ({
  getAllComments: vi.fn(),
  setCommentApproval: vi.fn(),
  deleteComment: vi.fn(),
}));

import { getAllComments, setCommentApproval, deleteComment } from '@/infra/comment.repo';

describe('listAllComments', () => {
  it('returns all comments', async () => {
    const mockComments = [{ id: 1, tool_slug: 'compress-pdf', author_name: 'Alice', content: 'Great', approved: false, created_at: '2024-01-01' }];
    vi.mocked(getAllComments).mockResolvedValue(mockComments);

    const result = await listAllComments();
    expect(result).toEqual(mockComments);
  });
});

describe('approveComment', () => {
  it('returns updated comment', async () => {
    const updated = { id: 1, approved: true } as ReturnType<typeof setCommentApproval> extends Promise<infer T> ? NonNullable<T> : never;
    vi.mocked(setCommentApproval).mockResolvedValue(updated);

    const result = await approveComment(1, true);
    expect(result).toEqual(updated);
  });

  it('throws NotFoundError when comment does not exist', async () => {
    vi.mocked(setCommentApproval).mockResolvedValue(null);
    await expect(approveComment(999, true))
      .rejects.toThrow('Comment not found.');
  });
});

describe('removeComment', () => {
  it('deletes successfully', async () => {
    vi.mocked(deleteComment).mockResolvedValue(true);
    await expect(removeComment(1)).resolves.toBeUndefined();
  });

  it('throws NotFoundError when comment does not exist', async () => {
    vi.mocked(deleteComment).mockResolvedValue(false);
    await expect(removeComment(999))
      .rejects.toThrow('Comment not found.');
  });
});
