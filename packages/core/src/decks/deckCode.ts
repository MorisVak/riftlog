import { SET_MAP, VARIANT_MAP, getCodeFromDeck, getDeckFromCode } from '@piltoverarchive/riftbound-deck-codes';
import { parsePrintingCode } from '../catalog/printingCode';

/**
 * Deck codes. This is the ONLY file that imports the deck-code library;
 * everything else goes through these exports, so no library type leaks out
 * and swapping or upgrading the library touches one file. Printing codes are
 * ours (`SFD-149a`, `UNL-229*`, `VEN-R01`); signed printings use `*`.
 */

/**
 * Whether a paste looks like a deck code rather than a text decklist: one
 * token of base32 characters (A–Z, 2–7), no whitespace inside. The
 * 16-character floor keeps a stray word from being mistaken for a code.
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

/**
 * Whether a deck code can carry this printing: a deck-code set, no promo
 * parent, and a variant the format knows (`OPP-OGN-259m` can't).
 */
export const deckCodeCanCarry = (code: string): boolean => {
  const parts = parsePrintingCode(code);
  return (
    parts !== null &&
    parts.parent === null &&
    deckCodeSetId(parts.set) !== null &&
    typeof (VARIANT_MAP as Record<string, unknown>)[parts.variant] === 'number'
  );
};

/** One card in a deck code: a printing code and how many copies. */
export type DeckCodeCard = { code: string; count: number };

/**
 * A decoded deck code, as the code carries it: no sections. `cards` holds
 * everything outside the sideboard — legend, chosen champion's copy,
 * battlefields, runes and the main deck — so sorting them needs card types
 * (see `deckListFromCode`).
 */
export type DecodedDeck = {
  cards: DeckCodeCard[];
  sideboard: DeckCodeCard[];
  /** The chosen champion's printing code; its copy is also in `cards`. */
  chosenChampion: string | null;
  /** Legends brought besides the starting one (not in the game yet). */
  additionalLegends: string[];
};

/**
 * Why a code couldn't be read: `newer_format` = made by a newer version of
 * the format (or with sets / printings this version doesn't know) — updating
 * Riftlog may fix it; `invalid` = not a deck code, or a damaged one.
 */
export class DeckCodeError extends Error {
  readonly kind: 'invalid' | 'newer_format';
  constructor(kind: 'invalid' | 'newer_format', message: string) {
    super(message);
    this.name = 'DeckCodeError';
    this.kind = kind;
  }
}

/** Sets / variants / number prefixes this version doesn't know, or a higher version. */
const NEWER = /Unsupported version|Unknown (set|variant|number-prefix)/i;

const toError = (error: unknown): DeckCodeError => {
  const message = error instanceof Error ? error.message : String(error);
  // "Unsupported format: 2. Expected format: 1" — only a higher one is newer.
  const format = /Unsupported format: (\d+)\. Expected format: (\d+)/.exec(message);
  const newer = format ? Number(format[1]) > Number(format[2]) : NEWER.test(message);
  return new DeckCodeError(newer ? 'newer_format' : 'invalid', message);
};

const toCards = (deck: { cardCode: string; count: number }[]): DeckCodeCard[] =>
  deck.map((c) => ({ code: c.cardCode, count: c.count }));

/** Reads a deck code. Throws a DeckCodeError when it can't. */
export function decodeDeckCode(input: string): DecodedDeck {
  const code = input.trim();
  if (!looksLikeDeckCode(code)) throw new DeckCodeError('invalid', 'Not a deck code.');
  try {
    const deck = getDeckFromCode(code, { signedSuffix: '*' });
    return {
      cards: toCards(deck.mainDeck),
      sideboard: toCards(deck.sideboard),
      chosenChampion: deck.chosenChampion ?? null,
      additionalLegends: deck.additionalLegends ?? [],
    };
  } catch (error) {
    throw toError(error);
  }
}

/**
 * Writes a deck code. Every printing code must be one deck codes can carry
 * (not a promo-set code); otherwise this throws a DeckCodeError.
 */
export function encodeDeckCode(deck: DecodedDeck): string {
  try {
    return getCodeFromDeck(
      deck.cards.map((c) => ({ cardCode: c.code, count: c.count })),
      deck.sideboard.map((c) => ({ cardCode: c.code, count: c.count })),
      deck.chosenChampion ?? undefined,
      deck.additionalLegends.length ? deck.additionalLegends : undefined,
    );
  } catch (error) {
    throw toError(error);
  }
}
