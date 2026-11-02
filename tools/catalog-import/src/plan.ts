/**
 * Desired rows vs. what the database holds → exactly what an --apply would
 * write. Pure: the caller passes in the current rows and an id generator.
 *
 * Rules: rows with manually_edited = true are never touched; rows we didn't
 * import (source = 'manual' / 'riot') are reported as conflicts, not
 * overwritten; only rows that really differ are written; nothing is deleted —
 * rows that left the source are only listed.
 */
import type { Database } from '@riftlog/core';
import type { Desired, DesiredCard, DesiredPrinting, DesiredSet, Override } from './transform';

type Tables = Database['public']['Tables'];
export type SetRow = Tables['sets']['Row'];
export type CardRow = Tables['cards']['Row'];
export type PrintingRow = Tables['card_printings']['Row'];
export type OverrideRow = Tables['catalog_overrides']['Row'];

export type CatalogSnapshot = {
  sets: SetRow[];
  cards: CardRow[];
  printings: PrintingRow[];
  overrides: OverrideRow[];
};

export type SetWrite = Tables['sets']['Insert'];
export type CardWrite = Tables['cards']['Insert'] & { id: string };
export type PrintingWrite = Tables['card_printings']['Insert'];
export type OverrideWrite = Tables['catalog_overrides']['Insert'];

export type Change<W> = { row: W; changed: string[] };

export type TablePlan<W> = {
  insert: W[];
  update: Change<W>[];
  unchanged: number;
  /** Keys of rows left alone because manually_edited = true. */
  skippedEdited: string[];
  /** Keys of rows we'd write but which came from elsewhere (manual / riot). */
  conflicts: { key: string; source: string }[];
};

export type Plan = {
  overrides: Omit<TablePlan<OverrideWrite>, 'skippedEdited' | 'conflicts'> & {
    /** In the database but not in overrides.json. Not deleted. */
    onlyInDatabase: string[];
  };
  sets: TablePlan<SetWrite>;
  cards: TablePlan<CardWrite>;
  printings: TablePlan<PrintingWrite>;
  /** Imported rows the source no longer has. Listed, never deleted. */
  missingFromSource: { printings: string[]; cards: string[] };
  /** Reasons the import must not be applied. Empty = safe to apply. */
  stops: string[];
};

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The columns of `desired` whose value differs from `current`. */
const diff = (desired: Record<string, unknown>, current: Record<string, unknown>): string[] =>
  Object.keys(desired).filter((k) => !same(desired[k] ?? null, current[k] ?? null));

function planTable<D extends Record<string, unknown>, C extends { source: string; manually_edited: boolean }, W>(
  desired: D[],
  current: C[],
  keyOf: (row: D | C) => string,
  toWrite: (row: D, existing: C | undefined) => W & Record<string, unknown>,
): TablePlan<W> {
  const byKey = new Map(current.map((c) => [keyOf(c), c]));
  const plan: TablePlan<W> = { insert: [], update: [], unchanged: 0, skippedEdited: [], conflicts: [] };
  for (const d of desired) {
    const key = keyOf(d);
    const existing = byKey.get(key);
    const row = toWrite(d, existing);
    if (!existing) {
      plan.insert.push(row);
      continue;
    }
    if (existing.manually_edited) {
      plan.skippedEdited.push(key);
      continue;
    }
    const changed = diff(row, existing as unknown as Record<string, unknown>);
    if (changed.length === 0) {
      plan.unchanged++;
    } else if (existing.source !== 'riftcodex') {
      plan.conflicts.push({ key, source: existing.source });
    } else {
      plan.update.push({ row, changed });
    }
  }
  return plan;
}

export function makePlan(input: {
  desired: Desired;
  current: CatalogSnapshot;
  overrides: Override[];
  newId: () => string;
}): Plan {
  const { desired, current, overrides, newId } = input;
  const stops: string[] = [];

  // Safety stops.
  for (const d of desired.report.duplicateCodes) {
    stops.push(`two entries map to ${d.code}: ${d.entries.map((e) => `${e.riftbound_id} (${e.riftcodex_id})`).join(', ')}`);
  }
  for (const t of desired.report.typeConflicts) {
    stops.push(`"${t.name_key}" has more than one card type: ${t.types.join(', ')}`);
  }
  const imported = current.printings.filter((p) => p.source === 'riftcodex').length;
  if (imported > 0 && desired.printings.length < imported * 0.9) {
    stops.push(
      `Riftcodex gave ${desired.printings.length} printings, more than 10% fewer than the ${imported} already imported`,
    );
  }

  // Overrides: overrides.json → catalog_overrides.
  const overrideKey = (o: { riftcodex_id: string; field: string }) => `${o.riftcodex_id}:${o.field}`;
  const currentOverrides = new Map(current.overrides.map((o) => [overrideKey(o), o]));
  const fileKeys = new Set(overrides.map(overrideKey));
  const overridePlan: Plan['overrides'] = { insert: [], update: [], unchanged: 0, onlyInDatabase: [] };
  for (const o of overrides) {
    const row: OverrideWrite = { riftcodex_id: o.riftcodex_id, field: o.field, value: o.value as never, note: o.note };
    const existing = currentOverrides.get(overrideKey(o));
    if (!existing) overridePlan.insert.push(row);
    else {
      const changed = diff({ value: row.value, note: row.note }, existing);
      if (changed.length) overridePlan.update.push({ row, changed });
      else overridePlan.unchanged++;
    }
  }
  overridePlan.onlyInDatabase = current.overrides.filter((o) => !fileKeys.has(overrideKey(o))).map(overrideKey);

  // Sets.
  const sets = planTable<DesiredSet, SetRow, SetWrite>(
    desired.sets,
    current.sets,
    (r) => r.code,
    (d) => ({ ...d, source: 'riftcodex' }),
  );

  // Cards, keyed by name_key; new cards get their id here so printings can
  // point at them in the same run.
  const cards = planTable<DesiredCard, CardRow, CardWrite>(
    desired.cards,
    current.cards,
    (r) => r.name_key,
    (d, existing) => ({ id: existing?.id ?? newId(), ...d, source: 'riftcodex' }),
  );
  const cardId = new Map<string, string>(current.cards.map((c) => [c.name_key, c.id]));
  for (const c of cards.insert) cardId.set(c.name_key, c.id);

  // Printings, keyed by code.
  const printings = planTable<DesiredPrinting, PrintingRow, PrintingWrite>(
    desired.printings,
    current.printings,
    (r) => r.code,
    ({ name_key, ...p }) => ({ ...p, card_id: cardId.get(name_key) ?? '', source: 'riftcodex' }),
  );

  const desiredCodes = new Set(desired.printings.map((p) => p.code));
  const desiredKeys = new Set(desired.cards.map((c) => c.name_key));

  return {
    overrides: overridePlan,
    sets,
    cards,
    printings,
    missingFromSource: {
      printings: current.printings.filter((p) => p.source === 'riftcodex' && !desiredCodes.has(p.code)).map((p) => p.code),
      cards: current.cards.filter((c) => c.source === 'riftcodex' && !desiredKeys.has(c.name_key)).map((c) => c.name),
    },
    stops,
  };
}

export const hasChanges = (plan: Plan): boolean =>
  [plan.overrides, plan.sets, plan.cards, plan.printings].some((t) => t.insert.length + t.update.length > 0);
