import { describe, it, expect } from 'vitest';
import { formatFileSize, getCompressionPercent, cn } from './utils';

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('getCompressionPercent', () => {
  it('returns 0 when original is 0', () => {
    expect(getCompressionPercent(0, 0)).toBe(0);
  });

  it('calculates compression percentage', () => {
    expect(getCompressionPercent(100, 75)).toBe(25);
    expect(getCompressionPercent(200, 100)).toBe(50);
  });

  it('returns 100 when compressed to 0', () => {
    expect(getCompressionPercent(100, 0)).toBe(100);
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('deduplicates tailwind classes', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });
});
