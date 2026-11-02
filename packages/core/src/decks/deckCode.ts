import { SET_MAP } from '@piltoverarchive/riftbound-deck-codes';

/**
 * Deck codes. This is the ONLY file that imports the deck-code library;
 * everything else goes through these exports, so no library type leaks out
 * and swapping or upgrading the library touches one file.
 *
 * Decoding and encoding aren't built yet — only detection and the set ids.
 */

/**
 * Whether a paste looks like a Piltover Archive deck code rather than a text
 * decklist: one token of base32 characters (A–Z, 2–7), no whitespace inside.
 *
 * Detection only. The import UI uses this to show a friendly "coming soon"
 * note instead of a wall of parse errors. The 16-character floor keeps a
 * stray word from being mistaken for a code.
 */
export const looksLikeDeckCode = (input: string): boolean =>
  /^[A-Z2-7]{16,}$/.test(input.trim());

/**
 * The numeric id deck codes use for a set (OGN → 0, VEN → 5), or null when a
 * deck code can't carry the set — the promo sets (OPP, PR, JDG) have none.
 */
export const deckCodeSetId = (setCode: string): number | null => {
  const id: unknown = SET_MAP[setCode];
  // typeof also rules out inherited keys like "constructor".
  return typeof id === 'number' ? id : null;
};
