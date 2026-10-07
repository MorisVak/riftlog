import type { CardRef, DeckList } from '../types/deck';

const isCardRef = (v: unknown): v is CardRef => {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.name === 'string' &&
    (c.code === null || typeof c.code === 'string') &&
    typeof c.count === 'number' &&
    Number.isInteger(c.count) &&
    c.count > 0
  );
};

const isCardArray = (v: unknown): v is CardRef[] =>
  Array.isArray(v) && v.every(isCardRef);

/**
 * Runtime check for a DeckList read back from storage (a `deck_versions.list`
 * jsonb). The database only checks the outline; this checks every card, so a
 * malformed row fails loudly at the boundary instead of deep in a render.
 */
export function isDeckList(value: unknown): value is DeckList {
  if (typeof value !== 'object' || value === null) return false;
  const l = value as Record<string, unknown>;
  return (
    (l.legend === null || isCardRef(l.legend)) &&
    (l.champion === null || isCardRef(l.champion)) &&
    isCardArray(l.main) &&
    isCardArray(l.battlefields) &&
    isCardArray(l.runes) &&
    isCardArray(l.sideboard) &&
    isCardArray(l.additionalLegends)
  );
}
