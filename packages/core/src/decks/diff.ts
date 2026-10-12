import type { CardRef, DeckList } from '../types/deck';
import type { DeckSection } from './sections';

/**
 * One card whose count differs between two lists. `before` 0 = added,
 * `after` 0 = removed; otherwise the count changed.
 */
export type DeckCardChange = {
  name: string;
  before: number;
  after: number;
};

export type DeckSectionDiff = {
  section: DeckSection;
  changes: DeckCardChange[];
};

/** Sections compared, in display order. */
const SECTIONS: readonly DeckSection[] = [
  'legend',
  'champion',
  'main',
  'battlefields',
  'runes',
  'sideboard',
];

const cardsOf = (list: DeckList, section: DeckSection): CardRef[] => {
  switch (section) {
    case 'legend':
      return [
        ...(list.legend ? [list.legend] : []),
        ...list.additionalLegends,
      ];
    case 'champion':
      return list.champion ? [list.champion] : [];
    default:
      return list[section];
  }
};

/** Matching is by name, case- and whitespace-insensitive (text imports carry no codes). */
const keyOf = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

/** Totals per card, keeping the first spelling seen and first-seen order. */
const tally = (cards: readonly CardRef[]) => {
  const map = new Map<string, { name: string; count: number }>();
  for (const c of cards) {
    const k = keyOf(c.name);
    const cur = map.get(k);
    if (cur) cur.count += c.count;
    else map.set(k, { name: c.name, count: c.count });
  }
  return map;
};

/**
 * What changed from `before` to `after`, per section — the "before and after"
 * of a deck edit. Only sections with changes are returned (an empty array
 * means the lists are the same). Within a section, cards keep `after`'s order
 * (changed and added), with removed cards last in `before`'s order.
 */
export function diffDeckLists(
  before: DeckList,
  after: DeckList,
): DeckSectionDiff[] {
  const out: DeckSectionDiff[] = [];
  for (const section of SECTIONS) {
    const a = tally(cardsOf(before, section));
    const b = tally(cardsOf(after, section));
    const changes: DeckCardChange[] = [];
    for (const [k, card] of b) {
      const prev = a.get(k)?.count ?? 0;
      if (prev !== card.count) {
        changes.push({ name: card.name, before: prev, after: card.count });
      }
    }
    for (const [k, card] of a) {
      if (!b.has(k)) changes.push({ name: card.name, before: card.count, after: 0 });
    }
    if (changes.length > 0) out.push({ section, changes });
  }
  return out;
}
