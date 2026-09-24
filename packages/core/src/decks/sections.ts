import type { CardRef, DeckList } from '../types/deck';

/** The sections of a decklist, in display order. */
export type DeckSection =
  | 'legend'
  | 'champion'
  | 'main'
  | 'battlefields'
  | 'runes'
  | 'sideboard';

/**
 * Sizes a legal deck aims for. The sideboard deliberately has no target:
 * SPEC says 8, but Piltover Archive currently shows decks with 10, so it's
 * reported as a plain count and never checked.
 */
export const DECK_TARGETS = {
  /** Includes the chosen champion — see `DeckList.main`. */
  main: 40,
  runes: 12,
  battlefields: 3,
} as const;

export type SectionTotals = {
  /** The chosen champion plus `main`, i.e. the 40-card main deck. */
  main: number;
  runes: number;
  battlefields: number;
  sideboard: number;
};

const sum = (cards: readonly CardRef[]): number =>
  cards.reduce((n, c) => n + c.count, 0);

/** Card counts per section. The single place the champion is added back. */
export function sectionTotals(list: DeckList): SectionTotals {
  return {
    main: (list.champion?.count ?? 0) + sum(list.main),
    runes: sum(list.runes),
    battlefields: sum(list.battlefields),
    sideboard: sum(list.sideboard),
  };
}

/** A list with nothing in it. */
export const emptyDeckList = (): DeckList => ({
  legend: null,
  champion: null,
  main: [],
  battlefields: [],
  runes: [],
  sideboard: [],
  additionalLegends: [],
});
