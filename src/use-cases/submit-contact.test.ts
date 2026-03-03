import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitContact } from './submit-contact';

vi.mock('@/infra/turnstile', () => ({
  verifyTurnstile: vi.fn(),
}));

vi.mock('@/infra/contact.repo', () => ({
  insertContact: vi.fn(),
}));

import { verifyTurnstile } from '@/infra/turnstile';
import { insertContact } from '@/infra/contact.repo';

const validInput = {
  name: 'Alice',
  email: 'alice@test.com',
  message: 'Hello, I have a question.',
  turnstileToken: 'valid-token',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyTurnstile).mockResolvedValue(true);
});

describe('submitContact', () => {
  it('throws CaptchaError when turnstile fails', async () => {
    vi.mocked(verifyTurnstile).mockResolvedValue(false);
    await expect(submitContact(validInput))
      .rejects.toThrow('Captcha verification failed.');
  });

  it('throws CaptchaError when no token', async () => {
    await expect(submitContact({ ...validInput, turnstileToken: undefined }))
      .rejects.toThrow('Captcha verification failed.');
  });

  it('throws ValidationError for empty fields', async () => {
    await expect(submitContact({ ...validInput, name: '' }))
      .rejects.toThrow('All fields are required.');
  });

  it('throws ValidationError for invalid email', async () => {
    await expect(submitContact({ ...validInput, email: 'not-email' }))
      .rejects.toThrow('Invalid email');
  });

  it('inserts contact on success', async () => {
    await submitContact(validInput);
    expect(insertContact).toHaveBeenCalledWith('Alice', 'alice@test.com', 'Hello, I have a question.');
  });
});
