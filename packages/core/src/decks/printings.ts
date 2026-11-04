import { normalizeCardName } from '../catalog/names';
import type { CardRef, DeckList } from '../types/deck';

/** Every entry of a list, in one fixed order (the order printings are handed over in). */
const entries = (list: DeckList): CardRef[] => [
  ...(list.legend ? [list.legend] : []),
  ...(list.champion ? [list.champion] : []),
  ...list.main,
  ...list.battlefields,
  ...list.runes,
  ...list.sideboard,
  ...list.additionalLegends,
  ...(list.unsorted ?? []),
];

/**
 * `list` with each card's printing taken from `from` where the list has none.
 *
 * The text format carries names only, so a list edited as text (or a deck
 * code shown as text) loses its printing codes; this puts them back. A card
 * whose name is in `from` gets that printing; a name `from` has several times
 * (say 1 alt art + 2 base in different lines) hands its codes out in order,
 * then repeats the first. New cards keep `code: null` — the base printing.
 * Cards that already have a code (an `Unsorted:` line) are left alone.
 */
export function withPrintingsFrom(list: DeckList, from: DeckList): DeckList {
  const queues = new Map<string, string[]>();
  for (const c of entries(from)) {
    if (!c.code) continue;
    const key = normalizeCardName(c.name);
    const q = queues.get(key);
    if (q) q.push(c.code);
    else queues.set(key, [c.code]);
  }
  const taken = new Map<string, number>();
  const fill = (c: CardRef): CardRef => {
    if (c.code) return c;
    const key = normalizeCardName(c.name);
    const q = queues.get(key);
    if (!q) return c;
    const i = taken.get(key) ?? 0;
    taken.set(key, i + 1);
    return { ...c, code: q[i] ?? q[0] ?? null };
  };
  return {
    ...list,
    legend: list.legend ? fill(list.legend) : null,
    champion: list.champion ? fill(list.champion) : null,
    main: list.main.map(fill),
    battlefields: list.battlefields.map(fill),
    runes: list.runes.map(fill),
    sideboard: list.sideboard.map(fill),
    additionalLegends: list.additionalLegends.map(fill),
    ...(list.unsorted ? { unsorted: list.unsorted.map(fill) } : {}),
  };
}

/** Every card's name and printing, in order — two lists with the same key are the same deck, printings included. */
export const printingsKey = (list: DeckList): string =>
  entries(list)
    .map((c) => `${normalizeCardName(c.name)}|${c.code ?? ''}|${c.count}`)
    .join('\n');
