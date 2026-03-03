import { describe, it, expect, vi } from 'vitest';
import { getComments } from './get-comments';

vi.mock('@/infra/comment.repo', () => ({
  getApprovedComments: vi.fn(),
}));

import { getApprovedComments } from '@/infra/comment.repo';

describe('getComments', () => {
  it('throws ValidationError for invalid tool slug', async () => {
    await expect(getComments('nonexistent'))
      .rejects.toThrow('Invalid tool.');
  });

  it('throws ValidationError for empty slug', async () => {
    await expect(getComments(''))
      .rejects.toThrow('Invalid tool.');
  });

  it('returns approved comments for valid tool', async () => {
    const mockComments = [
      { id: 1, author_name: 'Alice', content: 'Great!', created_at: '2024-01-01' },
    ];
    vi.mocked(getApprovedComments).mockResolvedValue(mockComments);

    const result = await getComments('compress-pdf');
    expect(result).toEqual(mockComments);
    expect(getApprovedComments).toHaveBeenCalledWith('compress-pdf');
  });
});
