/**
 * Which printing stands for a card: the importer takes the card's fields and
 * text from it, and the app shows its art for a name-only (text-imported)
 * card. One function for both, so they can never pick differently.
 */

export type BasePrintingCandidate = {
  code: string;
  status: 'spoiler' | 'released';
  /** In a set deck codes can't carry (OPP / PR / JDG). */
  promo: boolean;
  set_code: string;
  variant: string;
  alt_art: boolean;
  overnumbered: boolean;
  signed: boolean;
  /** The set's release date (YYYY-MM-DD), or null if unknown. */
  setReleasedOn: string | null;
};

/** Main sets rank first, then OGS (the starter set), then promo sets. */
const tier = (p: BasePrintingCandidate): number => (p.promo ? 2 : p.set_code === 'OGS' ? 1 : 0);

/** No variant suffix and not alt art, overnumbered or signed. */
const isPlain = (p: BasePrintingCandidate): boolean =>
  p.variant === '' && !p.alt_art && !p.overnumbered && !p.signed;

/**
 * A released printing over a spoiler; then main set, OGS, promo; then a plain
 * printing over a variant; then the most recently released set (a reprint may
 * carry newer wording); then the lowest code, so the result is stable.
 */
export function pickBasePrinting<T extends BasePrintingCandidate>(printings: readonly T[]): T | null {
  let best: T | null = null;
  for (const p of printings) {
    if (best === null || compareBase(p, best) < 0) best = p;
  }
  return best;
}

const compareBase = (a: BasePrintingCandidate, b: BasePrintingCandidate): number =>
  Number(a.status !== 'released') - Number(b.status !== 'released') ||
  tier(a) - tier(b) ||
  Number(!isPlain(a)) - Number(!isPlain(b)) ||
  (b.setReleasedOn ?? '').localeCompare(a.setReleasedOn ?? '') ||
  a.code.localeCompare(b.code);
