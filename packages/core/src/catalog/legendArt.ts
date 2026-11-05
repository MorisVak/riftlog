import type { CatalogCard, CatalogIndex, CatalogPrinting } from './match';

/**
 * Which art the app shows for a legend — a display preference, stored on the
 * profile (`profiles.legend_art`). It never changes a deck's list or its deck
 * code; it only picks the printing whose art is drawn behind deck cards,
 * match rows, the board and the versus screens.
 *
 * - `picks`: a printing code per legend (card id). Wins over everything.
 * - `overnumbered`: otherwise, prefer the legend's overnumbered art when it
 *   has one (the plain one, not the signed copy).
 * Neither → the deck's own printing, as before.
 */
export type LegendArt = {
  overnumbered: boolean;
  picks: Record<string, string>;
};

export const NO_LEGEND_ART: LegendArt = { overnumbered: false, picks: {} };

/** The stored jsonb, defensively: anything malformed reads as no preference. */
export function parseLegendArt(value: unknown): LegendArt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return NO_LEGEND_ART;
  const v = value as { overnumbered?: unknown; picks?: unknown };
  const picks: Record<string, string> = {};
  if (v.picks && typeof v.picks === 'object' && !Array.isArray(v.picks)) {
    for (const [cardId, code] of Object.entries(v.picks)) {
      if (typeof code === 'string' && code !== '') picks[cardId] = code;
    }
  }
  return { overnumbered: v.overnumbered === true, picks };
}

const hasArt = (p: CatalogPrinting) => p.image_url !== null || p.storage_path !== null;

/** A legend's printings that have art to show — the choices for a pick. */
export function legendArtOptions(card: CatalogCard, index: CatalogIndex): CatalogPrinting[] {
  return (index.printingsByCard.get(card.id) ?? []).filter(hasArt);
}

/**
 * The printing to draw for a card, given the preference. Only legends are
 * affected; `current` (the deck's own printing, or the base one) is the
 * fallback, and is kept when it already satisfies the overnumbered toggle.
 */
export function legendArtPrinting(
  card: CatalogCard,
  current: CatalogPrinting | null,
  pref: LegendArt,
  index: CatalogIndex,
): CatalogPrinting | null {
  if (card.type !== 'Legend') return current;
  const code = pref.picks[card.id];
  if (code) {
    const picked = index.printingByCode.get(code);
    if (picked && picked.card_id === card.id && hasArt(picked)) return picked;
  }
  if (pref.overnumbered) {
    if (current?.overnumbered) return current;
    const over = legendArtOptions(card, index).find((p) => p.overnumbered && !p.signed);
    if (over) return over;
  }
  return current;
}
