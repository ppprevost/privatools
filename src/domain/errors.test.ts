import { describe, it, expect } from 'vitest';
import { validationError, rateLimitError, captchaError, notFoundError, authError } from './errors';

describe('domain errors', () => {
  it('validationError has correct name and message', () => {
    const err = validationError('bad input');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('bad input');
    expect(err).toBeInstanceOf(Error);
  });

  it('rateLimitError has correct name and default message', () => {
    const err = rateLimitError();
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('Too many requests. Please try again later.');
  });

  it('rateLimitError accepts custom message', () => {
    const err = rateLimitError('custom');
    expect(err.message).toBe('custom');
  });

  it('captchaError has correct name and default message', () => {
    const err = captchaError();
    expect(err.name).toBe('CaptchaError');
    expect(err.message).toBe('Captcha verification failed.');
  });

  it('notFoundError has correct name and message', () => {
    const err = notFoundError('not here');
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('not here');
  });

  it('authError has correct name and default message', () => {
    const err = authError();
    expect(err.name).toBe('AuthError');
    expect(err.message).toBe('Unauthorized.');
  });
});
