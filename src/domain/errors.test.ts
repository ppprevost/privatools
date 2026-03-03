import { describe, it, expect } from 'vitest';
import { ValidationError, RateLimitError, CaptchaError, NotFoundError, AuthError } from './errors';

describe('domain errors', () => {
  it('ValidationError has correct name and message', () => {
    const err = new ValidationError('bad input');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('bad input');
    expect(err).toBeInstanceOf(Error);
  });

  it('RateLimitError has correct name and default message', () => {
    const err = new RateLimitError();
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('Too many requests. Please try again later.');
  });

  it('RateLimitError accepts custom message', () => {
    const err = new RateLimitError('custom');
    expect(err.message).toBe('custom');
  });

  it('CaptchaError has correct name and default message', () => {
    const err = new CaptchaError();
    expect(err.name).toBe('CaptchaError');
    expect(err.message).toBe('Captcha verification failed.');
  });

  it('NotFoundError has correct name and message', () => {
    const err = new NotFoundError('not here');
    expect(err.name).toBe('NotFoundError');
    expect(err.message).toBe('not here');
  });

  it('AuthError has correct name and default message', () => {
    const err = new AuthError();
    expect(err.name).toBe('AuthError');
    expect(err.message).toBe('Unauthorized.');
  });
});
