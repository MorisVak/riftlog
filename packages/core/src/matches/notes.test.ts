import { describe, expect, it } from 'vitest';
import { NOTE_MAX, normalizeNote } from './notes';

describe('normalizeNote', () => {
  it('trims, and keeps inner line breaks', () => {
    expect(normalizeNote('  Missed lethal.\nPlay around Gust.  ')).toBe(
      'Missed lethal.\nPlay around Gust.',
    );
  });

  it('stores nothing for blank input', () => {
    expect(normalizeNote('')).toBeNull();
    expect(normalizeNote('   \n  ')).toBeNull();
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote(undefined)).toBeNull();
  });

  it('caps at the DB limit', () => {
    expect(normalizeNote('x'.repeat(NOTE_MAX + 50))).toHaveLength(NOTE_MAX);
  });
});
