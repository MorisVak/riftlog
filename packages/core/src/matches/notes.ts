/** Mirrors the `char_length(notes) <= 2000` CHECK on matches.notes / games.notes. */
export const NOTE_MAX = 2000;

/**
 * A note as stored: trimmed, and null when there's nothing in it (blank notes
 * aren't kept). Over-long input is cut to `NOTE_MAX` rather than rejected —
 * the editor already stops at the limit; this is the safety net.
 */
export function normalizeNote(text: string | null | undefined): string | null {
  const trimmed = (text ?? '').trim();
  return trimmed === '' ? null : trimmed.slice(0, NOTE_MAX);
}
