import { describe, it, expect } from 'vitest';
import { validateComment, validateContactMessage, isValidEmail, COMMENT_LIMITS, CONTACT_LIMITS } from './validators';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user+tag@sub.domain.org')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('no spaces@test.com')).toBe(false);
    expect(isValidEmail('@missing.com')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
  });
});

describe('validateComment', () => {
  it('accepts valid comment', () => {
    expect(validateComment('Alice', 'This is a great tool!')).toEqual({ valid: true });
  });

  it('rejects name too short', () => {
    const result = validateComment('AB', 'Valid content here');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Name');
  });

  it('rejects name too long', () => {
    const result = validateComment('A'.repeat(COMMENT_LIMITS.name.max + 1), 'Valid content here');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Name');
  });

  it('rejects content too short', () => {
    const result = validateComment('Alice', 'Short');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Comment');
  });

  it('rejects content too long', () => {
    const result = validateComment('Alice', 'X'.repeat(COMMENT_LIMITS.content.max + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Comment');
  });

  it('trims whitespace before validation', () => {
    expect(validateComment('  Alice  ', '  This is a great tool!  ')).toEqual({ valid: true });
  });

  it('handles null/undefined gracefully', () => {
    const result = validateComment(null as unknown as string, 'content');
    expect(result.valid).toBe(false);
  });
});

describe('validateContactMessage', () => {
  it('accepts valid contact message', () => {
    expect(validateContactMessage('Alice', 'alice@test.com', 'Hello there!')).toEqual({ valid: true });
  });

  it('rejects empty fields', () => {
    expect(validateContactMessage('', 'a@b.com', 'msg').valid).toBe(false);
    expect(validateContactMessage('Alice', '', 'msg').valid).toBe(false);
    expect(validateContactMessage('Alice', 'a@b.com', '').valid).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = validateContactMessage('Alice', 'not-an-email', 'Hello');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('email');
  });

  it('rejects name exceeding max length', () => {
    const result = validateContactMessage('A'.repeat(CONTACT_LIMITS.name.max + 1), 'a@b.com', 'msg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('long');
  });

  it('rejects message exceeding max length', () => {
    const result = validateContactMessage('Alice', 'a@b.com', 'M'.repeat(CONTACT_LIMITS.message.max + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('long');
  });
});
