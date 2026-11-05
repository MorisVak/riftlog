import type { CatalogCard, CatalogIndex, CatalogPrinting } from './match';

/**
 * Which art the app shows for a legend — a display preference, stored on the
 * profile (`profiles.legend_art`). It never changes a deck's list or its deck
 * code; it only picks the printing whose art is drawn.
 *
 * It replaces the **standard** art only: a deck that has a special printing
 * of its legend (overnumbered, signed, alt art, promo — typically from a
 * deck code) keeps it. A text import always gets the standard printing, so
 * this is how such a deck shows the art you play with.
 *
 * - `picks`: a printing code per legend (card id); wins over the toggle.
 * - `overnumbered`: otherwise, the legend's overnumbered art when it has one
 *   (the plain one, not the signed copy).
 * - `decklists`: also in decklists (the deck header, the legend's row and
 *   tile); off = decklists show the deck's printing as imported. The art
 *   behind deck cards, match rows, the board and the versus screens always
 *   follows the preference.
 */
export type LegendArt = {
  overnumbered: boolean;
  picks: Record<string, string>;
  decklists: boolean;
};

export const NO_LEGEND_ART: LegendArt = { overnumbered: false, picks: {}, decklists: true };

/** The stored jsonb, defensively: anything malformed reads as no preference. */
export function parseLegendArt(value: unknown): LegendArt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return NO_LEGEND_ART;
  const v = value as { overnumbered?: unknown; picks?: unknown; decklists?: unknown };
  const picks: Record<string, string> = {};
  if (v.picks && typeof v.picks === 'object' && !Array.isArray(v.picks)) {
    for (const [cardId, code] of Object.entries(v.picks)) {
      if (typeof code === 'string' && code !== '') picks[cardId] = code;
    }
  }
  return { overnumbered: v.overnumbered === true, picks, decklists: v.decklists !== false };
}

/** The plain printing: not overnumbered, signed, alt art or a promo. */
export const isStandardPrinting = (p: CatalogPrinting): boolean =>
  !p.overnumbered && !p.signed && !p.alt_art && !p.promo;

const hasArt = (p: CatalogPrinting) => p.image_url !== null || p.storage_path !== null;

/** A legend's printings that have art to show — the choices for a pick. */
export function legendArtOptions(card: CatalogCard, index: CatalogIndex): CatalogPrinting[] {
  return (index.printingsByCard.get(card.id) ?? []).filter(hasArt);
}

/**
 * The printing to draw for a card, given the preference. Only legends are
 * affected, and only where `current` (the deck's own printing, or the base
 * one) is the standard art — a special printing the deck has is kept.
 */
export function legendArtPrinting(
  card: CatalogCard,
  current: CatalogPrinting | null,
  pref: LegendArt,
  index: CatalogIndex,
): CatalogPrinting | null {
  if (card.type !== 'Legend') return current;
  if (current && !isStandardPrinting(current)) return current;
  const code = pref.picks[card.id];
  if (code) {
    const picked = index.printingByCode.get(code);
    if (picked && picked.card_id === card.id && hasArt(picked)) return picked;
  }
  if (pref.overnumbered) {
    const over = legendArtOptions(card, index).find((p) => p.overnumbered && !p.signed);
    if (over) return over;
  }
  return current;
}
