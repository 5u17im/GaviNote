import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeTitle,
  sanitizeTag,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_TAG_LENGTH,
} from './sanitize';

describe('sanitizeText', () => {
  it('strips ASCII control characters', () => {
    expect(sanitizeText('a\x00b\x1Fc\x7Fd')).toBe('abcd');
  });

  it('preserves tabs and newlines', () => {
    expect(sanitizeText('line1\nline2\tend')).toBe('line1\nline2\tend');
  });

  it('caps length to the default content limit', () => {
    const long = 'x'.repeat(MAX_CONTENT_LENGTH + 500);
    expect(sanitizeText(long)).toHaveLength(MAX_CONTENT_LENGTH);
  });

  it('respects a custom max length', () => {
    expect(sanitizeText('abcdef', 3)).toBe('abc');
  });

  it('returns empty string unchanged', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('sanitizeTitle', () => {
  it('caps to the title length', () => {
    const long = 'a'.repeat(MAX_TITLE_LENGTH + 10);
    expect(sanitizeTitle(long)).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe('sanitizeTag', () => {
  it('removes hash and whitespace', () => {
    expect(sanitizeTag('#my tag')).toBe('mytag');
  });

  it('caps to the tag length', () => {
    const long = 'z'.repeat(MAX_TAG_LENGTH + 5);
    expect(sanitizeTag(long).length).toBeLessThanOrEqual(MAX_TAG_LENGTH);
  });

  it('strips control chars and hashes together', () => {
    expect(sanitizeTag('#a\x00b c')).toBe('abc');
  });
});
