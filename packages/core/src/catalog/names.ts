/**
 * Card names and text as they come from the catalog source, and the one
 * normalizer that turns a name into the catalog's match key
 * (`cards.name_key`). The importer writes keys with it and the app matches
 * text-imported decks with it, so the two can never disagree.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decodes HTML entities (`&gt;`, `&#39;`, `&#x27;`) left in source text. */
export const unescapeHtml = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[entity.toLowerCase()] ?? whole;
  });

/** A trailing printing tag such as "(Alternate Art)", "(Signature)", "(Metal)". */
const PRINTING_TAG = /\s*\([^()]*\)\s*$/;

/**
 * The card's name without its printing tag:
 * "Vi - Piltover Enforcer (Signature)" → "Vi - Piltover Enforcer".
 */
export const baseCardName = (name: string): string =>
  unescapeHtml(name).replace(PRINTING_TAG, '').replace(/\s+/g, ' ').trim();

/**
 * "Riven, The Exile" or "Riven - The Exile" → { head: 'Riven', title: 'The Exile' }.
 * Deck exports write ", ", the catalog (and so deck codes) " - "; the split is
 * at the first of either. No separator → the whole name is the head.
 */
export const splitCardName = (name: string): { head: string; title: string } => {
  const m = /,\s*| - /.exec(name);
  if (!m) return { head: name.trim(), title: '' };
  return { head: name.slice(0, m.index).trim(), title: name.slice(m.index + m[0].length).trim() };
};

/**
 * The match key for a card name. Sources disagree on punctuation — the
 * catalog writes "Vi - Peacekeeper", deck exports "Vi, Peacekeeper" — so the
 * key treats " - " and ", " alike, straightens quotes, drops the printing
 * tag and ignores case: both become "vi, peacekeeper".
 */
export const normalizeCardName = (name: string): string =>
  baseCardName(name)
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+[-–—]\s+/g, ', ')
    .toLowerCase();

/**
 * Card text as stored in the catalog: HTML entities decoded and the source's
 * "[NO TEXT]" placeholder turned into an empty string. Nothing else changes.
 */
export const cleanCardText = (text: string | null | undefined): string => {
  if (text == null) return '';
  const decoded = unescapeHtml(text);
  return decoded.trim() === '[NO TEXT]' ? '' : decoded;
};
