/**
 * Matching deck cards to the card catalog. A card with a printing code
 * matches that printing; a name-only card (text import) matches by
 * normalized name and shows its card's base printing. Nothing is written
 * back to the deck.
 */
import type { CardRef, DeckList } from '../types/deck';
import type { DeckSection } from '../decks/sections';
import { pickBasePrinting } from './basePrinting';
import { normalizeCardName } from './names';

/** The catalog as the app caches it: only the columns it reads. */
export type CatalogSet = {
  code: string;
  name: string;
  released_on: string | null;
  deck_code_set_id: number | null;
  status: 'spoiler' | 'released';
};

export type CatalogCard = {
  id: string;
  name: string;
  name_key: string;
  type: string;
  supertype: string | null;
  domains: string[];
  energy: number | null;
  might: number | null;
  power: number | null;
  current_text: string;
  status: 'spoiler' | 'released';
};

export type CatalogPrinting = {
  code: string;
  card_id: string;
  set_code: string;
  variant: string;
  alt_art: boolean;
  overnumbered: boolean;
  signed: boolean;
  promo: boolean;
  image_url: string | null;
  storage_path: string | null;
  orientation: string;
  artist: string | null;
  status: 'spoiler' | 'released';
};

export type Catalog = {
  version: number;
  sets: CatalogSet[];
  cards: CatalogCard[];
  printings: CatalogPrinting[];
};

export type CatalogIndex = {
  version: number;
  cardById: Map<string, CatalogCard>;
  cardByKey: Map<string, CatalogCard>;
  printingByCode: Map<string, CatalogPrinting>;
  /** Each card's base printing (see pickBasePrinting). */
  basePrinting: Map<string, CatalogPrinting>;
};

export function buildCatalogIndex(catalog: Catalog): CatalogIndex {
  const released = new Map(catalog.sets.map((s) => [s.code, s.released_on]));
  const byCard = new Map<string, CatalogPrinting[]>();
  for (const p of catalog.printings) {
    const list = byCard.get(p.card_id) ?? [];
    list.push(p);
    byCard.set(p.card_id, list);
  }
  const basePrinting = new Map<string, CatalogPrinting>();
  for (const [cardId, printings] of byCard) {
    const base = pickBasePrinting(
      printings.map((p) => ({ ...p, setReleasedOn: released.get(p.set_code) ?? null, p })),
    );
    if (base) basePrinting.set(cardId, base.p);
  }
  return {
    version: catalog.version,
    cardById: new Map(catalog.cards.map((c) => [c.id, c])),
    cardByKey: new Map(catalog.cards.map((c) => [c.name_key, c])),
    printingByCode: new Map(catalog.printings.map((p) => [p.code, p])),
    basePrinting,
  };
}

export type CardMatch =
  /** Found. `printing` is the exact one (by code) or the card's base printing (by name). */
  | { kind: 'matched'; by: 'code' | 'name'; card: CatalogCard; printing: CatalogPrinting | null }
  /** The code and the name point to different cards; the code wins. */
  | { kind: 'conflict'; card: CatalogCard; printing: CatalogPrinting; listedAs: string }
  | { kind: 'unknown' };

export function matchCard(ref: Pick<CardRef, 'name' | 'code'>, index: CatalogIndex): CardMatch {
  const byName = index.cardByKey.get(normalizeCardName(ref.name));
  const printing = ref.code ? index.printingByCode.get(ref.code) : undefined;
  if (printing) {
    const card = index.cardById.get(printing.card_id);
    if (card) {
      return byName && byName.id !== card.id
        ? { kind: 'conflict', card, printing, listedAs: ref.name }
        : { kind: 'matched', by: 'code', card, printing };
    }
  }
  if (byName) {
    return { kind: 'matched', by: 'name', card: byName, printing: index.basePrinting.get(byName.id) ?? null };
  }
  return { kind: 'unknown' };
}

/** Every place a card can sit in a DeckList (additional legends included). */
export type ListSection = DeckSection | 'additionalLegends';

/** The card types each section holds. */
const SECTION_TYPES: Record<ListSection, readonly string[]> = {
  legend: ['Legend'],
  champion: ['Unit'],
  main: ['Unit', 'Spell', 'Gear'],
  battlefields: ['Battlefield'],
  runes: ['Rune'],
  sideboard: ['Unit', 'Spell', 'Gear'],
  additionalLegends: ['Legend'],
};

/** Whether a card of this type belongs in this section (a Unit under Battlefields doesn't). */
export const fitsSection = (section: ListSection, type: string): boolean =>
  SECTION_TYPES[section].includes(type);

export type CardIssue =
  | { kind: 'unknown' }
  | { kind: 'conflict'; listedAs: string; cardName: string }
  | { kind: 'misplaced'; type: string };

/** The problem to flag on a card in a section, if any. */
export function cardIssue(match: CardMatch, section: ListSection): CardIssue | null {
  if (match.kind === 'unknown') return { kind: 'unknown' };
  if (match.kind === 'conflict') return { kind: 'conflict', listedAs: match.listedAs, cardName: match.card.name };
  return fitsSection(section, match.card.type) ? null : { kind: 'misplaced', type: match.card.type };
}

export type DeckCheck = { unknown: number; conflicts: number; misplaced: number };

const SECTIONS: ListSection[] = ['legend', 'champion', 'main', 'battlefields', 'runes', 'sideboard', 'additionalLegends'];

/** Counts of distinct problem cards in a deck, for the summary under it. */
export function checkDeckList(list: DeckList, index: CatalogIndex): DeckCheck {
  const check: DeckCheck = { unknown: 0, conflicts: 0, misplaced: 0 };
  for (const section of SECTIONS) {
    const value = list[section];
    const cards = Array.isArray(value) ? value : value ? [value] : [];
    for (const card of cards) {
      const issue = cardIssue(matchCard(card, index), section);
      if (issue?.kind === 'unknown') check.unknown++;
      else if (issue?.kind === 'conflict') check.conflicts++;
      else if (issue?.kind === 'misplaced') check.misplaced++;
    }
  }
  return check;
}
