import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitComment } from './submit-comment';

vi.mock('@/infra/turnstile', () => ({
  verifyTurnstile: vi.fn(),
}));

vi.mock('@/infra/hash', () => ({
  hashIP: vi.fn().mockResolvedValue('abc123hash'),
}));

vi.mock('@/infra/comment.repo', () => ({
  countRecentByIp: vi.fn(),
  insertComment: vi.fn(),
}));

import { verifyTurnstile } from '@/infra/turnstile';
import { countRecentByIp, insertComment } from '@/infra/comment.repo';

const validInput = {
  toolSlug: 'compress-pdf',
  authorName: 'Alice',
  content: 'This is a great tool for compressing!',
  turnstileToken: 'valid-token',
  ip: '127.0.0.1',
  isMobile: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyTurnstile).mockResolvedValue(true);
  vi.mocked(countRecentByIp).mockResolvedValue(0);
});

describe('submitComment', () => {
  it('silently returns on honeypot trigger', async () => {
    await submitComment({ ...validInput, website: 'spam.com' });
    expect(insertComment).not.toHaveBeenCalled();
  });

  it('throws ValidationError for invalid tool', async () => {
    await expect(submitComment({ ...validInput, toolSlug: 'nonexistent' }))
      .rejects.toThrow('Invalid tool.');
  });

  it('throws ValidationError for short name', async () => {
    await expect(submitComment({ ...validInput, authorName: 'AB' }))
      .rejects.toThrow('Name');
  });

  it('throws ValidationError for short content', async () => {
    await expect(submitComment({ ...validInput, content: 'Short' }))
      .rejects.toThrow('Comment');
  });

  it('throws CaptchaError when turnstile fails', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(false);
    await expect(submitComment(validInput))
      .rejects.toThrow('Captcha verification failed.');
  });

  it('skips captcha for mobile clients', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(false);
    await submitComment({ ...validInput, isMobile: true, turnstileToken: undefined });
    expect(verifyTurnstile).not.toHaveBeenCalled();
    expect(insertComment).toHaveBeenCalled();
  });

  it('throws RateLimitError when too many comments', async () => {
    vi.mocked(countRecentByIp).mockResolvedValue(3);
    await expect(submitComment(validInput))
      .rejects.toThrow('Too many comments');
  });

  it('inserts comment on success', async () => {
    await submitComment(validInput);
    expect(insertComment).toHaveBeenCalledWith(
      'compress-pdf',
      'Alice',
      'This is a great tool for compressing!',
      'abc123hash'
    );
  });
});
