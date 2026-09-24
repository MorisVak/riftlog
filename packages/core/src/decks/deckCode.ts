/**
 * Whether a paste looks like a Piltover Archive deck code rather than a text
 * decklist: one token of base32 characters (A–Z, 2–7), no whitespace inside.
 *
 * Detection only — decoding isn't built yet. The import UI uses this to show
 * a friendly "coming soon" note instead of a wall of parse errors. The
 * 16-character floor keeps a stray word from being mistaken for a code.
 */
export const looksLikeDeckCode = (input: string): boolean =>
  /^[A-Z2-7]{16,}$/.test(input.trim());
