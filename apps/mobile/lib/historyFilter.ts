import { normalizeCardName, type CardRef } from '@riftlog/core';
import type { HistoryRowVM, Result } from './historyView';

/**
 * History's filters. Everything is optional and combines with AND; the
 * default (`NO_FILTER`) shows every match. Your own matches only — what you
 * filter is your record, never anyone else's (Riot policy).
 */
export type HistoryFilter = {
  /** Opponent name, deck or legend (yours or theirs), case-insensitive. */
  query: string;
  result: Result | null;
  format: 'BO1' | 'BO3' | null;
  period: Period | null;
  /** A deck id. */
  deckId: string | null;
  /** A legend, by normalized card name (printings of one legend count once). */
  yourLegend: string | null;
  opponentLegend: string | null;
};

export type Period = '7d' | '30d' | '90d';

export const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

export const NO_FILTER: HistoryFilter = {
  query: '',
  result: null,
  format: null,
  period: null,
  deckId: null,
  yourLegend: null,
  opponentLegend: null,
};

const legendKey = (c: CardRef | null) => (c ? normalizeCardName(c.name) : null);

export function applyFilter(
  vms: HistoryRowVM[],
  f: HistoryFilter,
  now: Date = new Date(),
): HistoryRowVM[] {
  const q = f.query.trim().toLowerCase();
  const since = f.period ? now.getTime() - PERIOD_DAYS[f.period] * 86_400_000 : null;
  return vms.filter((vm) => {
    if (f.result && vm.result !== f.result) return false;
    if (f.format && vm.format !== f.format) return false;
    if (since !== null && Date.parse(vm.endedAt) < since) return false;
    if (f.deckId && vm.deck?.id !== f.deckId) return false;
    if (f.yourLegend && legendKey(vm.yourLegend) !== f.yourLegend) return false;
    if (f.opponentLegend && legendKey(vm.opponentLegend) !== f.opponentLegend) return false;
    if (q) {
      const hay = [vm.opponent, vm.deck?.name, vm.yourLegend?.name, vm.opponentLegend?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** How many filters (not counting the search) are set — the button's badge. */
export const activeCount = (f: HistoryFilter): number =>
  [f.result, f.format, f.period, f.deckId, f.yourLegend, f.opponentLegend].filter((v) => v !== null)
    .length;

export type FilterOptions = {
  decks: { id: string; name: string }[];
  /** Legends you've played / played against, most recent first. */
  yourLegends: { key: string; card: CardRef }[];
  opponentLegends: { key: string; card: CardRef }[];
};

/** What there is to filter by: only decks and legends that appear in your matches. */
export function filterOptions(vms: HistoryRowVM[]): FilterOptions {
  const decks = new Map<string, string>();
  const yours = new Map<string, CardRef>();
  const theirs = new Map<string, CardRef>();
  for (const vm of vms) {
    if (vm.deck && !decks.has(vm.deck.id)) decks.set(vm.deck.id, vm.deck.name);
    const y = legendKey(vm.yourLegend);
    if (y && vm.yourLegend && !yours.has(y)) yours.set(y, vm.yourLegend);
    const t = legendKey(vm.opponentLegend);
    if (t && vm.opponentLegend && !theirs.has(t)) theirs.set(t, vm.opponentLegend);
  }
  return {
    decks: [...decks].map(([id, name]) => ({ id, name })),
    yourLegends: [...yours].map(([key, card]) => ({ key, card })),
    opponentLegends: [...theirs].map(([key, card]) => ({ key, card })),
  };
}
