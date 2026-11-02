import { describe, expect, it } from 'vitest';
import sample from './__fixtures__/riftcodex-sample.json';
import { parsePrintingCode } from '@riftlog/core';
import { parseOverrides } from './overrides';
import {
  hasChanges,
  makePlan,
  type CardRow,
  type CatalogSnapshot,
  type OverrideRow,
  type PrintingRow,
  type SetRow,
} from './plan';
import { parseCard, parseSet } from './riftcodex';
import { richCardText, transform, type Override } from './transform';
import overridesFile from '../overrides.json';

const cards = sample.cards.map((c, i) => parseCard(c, `sample #${i}`));
const sets = sample.sets.map((s, i) => parseSet(s, `sample set #${i}`));
const overrides = parseOverrides(overridesFile);
const AFTER_VEN = '2026-11-01';

const run = (opts: { overrides?: Override[]; today?: string } = {}) =>
  transform({ cards, sets, overrides: opts.overrides ?? overrides, today: opts.today ?? AFTER_VEN });

const printing = (d: ReturnType<typeof run>, code: string) => d.printings.find((p) => p.code === code);
const card = (d: ReturnType<typeof run>, key: string) => d.cards.find((c) => c.name_key === key);

describe('transform', () => {
  it('drops spoiler-era twins only when a released twin exists', () => {
    const d = run();
    expect(d.report.droppedTwins.map((t) => t.riftbound_id).sort()).toEqual(
      ['ven-113-166', 'ven-155-166', 'ven-197-166', 'ven-r03', 'ven-sp5-006'].sort(),
    );
    // ven-113a has no released twin, so it stays.
    expect(printing(d, 'VEN-113a')).toBeDefined();
  });

  it('maps riftbound ids to deck-code printing codes', () => {
    const d = run();
    expect(printing(d, 'SFD-149')).toMatchObject({ variant: '', alt_art: false, promo: false });
    expect(printing(d, 'SFD-149a')).toMatchObject({ variant: 'a', alt_art: true });
    expect(printing(d, 'UNL-229*')).toMatchObject({ variant: '*', signed: true });
    expect(printing(d, 'UNL-229')).toMatchObject({ variant: '', overnumbered: true });
    expect(printing(d, 'VEN-R03')).toMatchObject({ collector_number: 'R03' });
    expect(printing(d, 'VEN-SP5')).toMatchObject({ collector_number: 'SP5' });
    expect(printing(d, 'OPP-OGS-011')).toMatchObject({ promo: true, collector_number: 'OGS-011' });
  });

  it('skips the token, which has no printing code', () => {
    const d = run();
    expect(d.report.skipped.map((s) => s.riftbound_id)).toEqual(['sfd-t03']);
    expect(d.printings.some((p) => p.code.startsWith('SFD-T'))).toBe(false);
  });

  it('gives the Metal promo its own code via the override, and stops without it', () => {
    expect(printing(run(), 'OPP-OGN-259m')).toBeDefined();
    expect(printing(run(), 'OPP-OGN-259')).toBeDefined();
    expect(run().report.duplicateCodes).toEqual([]);
    expect(run({ overrides: [] }).report.duplicateCodes.map((d) => d.code)).toEqual(['OPP-OGN-259']);
  });

  it('fixes the broken Kennen legend name with an override, for both printings', () => {
    const fixed = run();
    const key = 'kennen, heart of the tempest';
    expect(card(fixed, key)?.name).toBe('Kennen - Heart of the Tempest');
    expect(fixed.printings.filter((p) => p.name_key === key).map((p) => p.code).sort()).toEqual(['VEN-155', 'VEN-197']);
    expect(fixed.report.suspiciousNames).toEqual([]);
    expect(run({ overrides: [] }).report.suspiciousNames.map((s) => s.riftbound_id).sort()).toEqual([
      'ven-155-166',
      'ven-197-166',
    ]);
  });

  it('takes card text from the base printing: newest main set, never a variant', () => {
    const d = run();
    const ezreal = card(d, 'ezreal, prodigy');
    const vi = card(d, 'vi, piltover enforcer');
    const flash = card(d, 'flash');
    // SFD-149 and VEN-SP5 are both plain main-set printings; VEN is newer.
    expect(ezreal?.current_text).toBe(printing(d, 'VEN-SP5')?.printed_text);
    // UNL-187 over the overnumbered UNL-229 and the signed UNL-229*.
    expect(vi?.current_text).toBe(printing(d, 'UNL-187')?.printed_text);
    // OGS over the OPP promo.
    expect(flash?.current_text).toBe(printing(d, 'OGS-011')?.printed_text);
    expect(d.printings.filter((p) => p.name_key === 'ezreal, prodigy')).toHaveLength(3);
  });

  it('decodes HTML entities and keeps one card per name', () => {
    const d = run();
    expect(d.printings.every((p) => !p.printed_text.includes('&gt;'))).toBe(true);
    expect(new Set(d.cards.map((c) => c.name_key)).size).toBe(d.cards.length);
    expect(d.report.typeConflicts).toEqual([]);
  });

  it('marks battlefields landscape and promo sets undeckable', () => {
    const d = run();
    expect(printing(d, 'OGN-298')?.orientation).toBe('landscape');
    expect(d.sets.find((s) => s.code === 'OPP')?.deck_code_set_id).toBeNull();
    expect(d.sets.find((s) => s.code === 'VEN')?.deck_code_set_id).toBe(5);
  });

  it('derives spoiler status from the set release date', () => {
    const before = run({ today: '2026-07-01' });
    expect(printing(before, 'VEN-155')?.status).toBe('spoiler');
    expect(card(before, 'kennen, heart of the tempest')?.status).toBe('spoiler');
    expect(printing(before, 'SFD-149')?.status).toBe('released');
    expect(printing(run(), 'VEN-155')?.status).toBe('released');
  });

  it('names the parent set in promo codes, so promos sharing a number stay apart', () => {
    const base = cards.find((c) => c.riftbound_id === 'opp-259-298' && !c.name.includes('Metal'));
    if (!base) throw new Error('fixture lacks opp-259-298');
    const fromSfd = { ...base, id: 'sfd-promo', riftbound_id: 'opp-259-221', name: 'Some SFD Card' };
    // Set sizes are learned from the main-set entries, so pass the whole sample.
    const d = transform({ cards: [...cards, fromSfd], sets, overrides, today: AFTER_VEN });
    expect(printing(d, 'OPP-SFD-259')?.name_key).toBe('some sfd card');
    expect(printing(d, 'OPP-OGN-259')).toBeDefined();
    expect(d.report.duplicateCodes).toEqual([]);
    const unknown = { ...base, id: 'odd', riftbound_id: 'opp-001-999' };
    const skipped = transform({ cards: [...cards, unknown], sets, overrides, today: AFTER_VEN }).report.skipped;
    expect(skipped.find((s) => s.riftcodex_id === 'odd')?.reason).toContain("can't tell which set");
  });

  // The database allows a parent segment for any set; this is what keeps it to
  // promo sets. A deck-code printing code must stay exactly as deck codes write it.
  it('gives a parent set only to codes in sets without a deck-code id', () => {
    const d = run();
    const deckable = new Map(d.sets.map((s) => [s.code, s.deck_code_set_id !== null]));
    expect(d.printings.some((p) => p.promo)).toBe(true);
    for (const p of d.printings) {
      const parts = parsePrintingCode(p.code);
      expect(parts, p.code).not.toBeNull();
      expect(parts?.parent !== null, p.code).toBe(!deckable.get(p.set_code));
      expect(p.promo, p.code).toBe(!deckable.get(p.set_code));
    }
    const sfd = cards.find((c) => c.riftbound_id === 'sfd-149-221');
    if (!sfd) throw new Error('fixture lacks sfd-149-221');
    const bad: Override = { riftcodex_id: sfd.id, field: 'code', value: 'SFD-OGN-149', note: null };
    const withBad = run({ overrides: [...overrides, bad] });
    expect(withBad.printings.find((p) => p.code === 'SFD-OGN-149')).toBeUndefined();
    expect(withBad.report.skipped.find((s) => s.riftcodex_id === sfd.id)?.reason).toContain('deckable');
  });

  it('treats a set with no release date as unreleased', () => {
    const undated = sets.map((s) => (s.set_id === 'SFD' ? { ...s, published_on: null } : s));
    const d = transform({ cards, sets: undated, overrides, today: AFTER_VEN });
    expect(d.sets.find((s) => s.code === 'SFD')?.status).toBe('spoiler');
    expect(printing(d, 'SFD-149')?.status).toBe('spoiler');
  });

  it('flags an unflagged printing numbered above its set size as overnumbered', () => {
    const ezreal = cards.find((c) => c.riftbound_id === 'sfd-149-221');
    if (!ezreal) throw new Error('fixture lacks sfd-149-221');
    // Like VEN-176: above the set size (221), no flag from the source.
    const above = { ...ezreal, id: 'above', riftbound_id: 'sfd-249-221' };
    const d = transform({ cards: [...cards, above], sets, overrides, today: AFTER_VEN });
    expect(printing(d, 'SFD-249')?.overnumbered).toBe(true);
    expect(printing(d, 'SFD-149')?.overnumbered).toBe(false);
    // Signed printings sit above the set size too, but aren't overnumbered.
    expect(printing(d, 'UNL-229*')?.overnumbered).toBe(false);
    // And the derived flag keeps it from being the card's base printing.
    expect(card(d, 'ezreal, prodigy')?.current_text).toBe(printing(d, 'VEN-SP5')?.printed_text);
  });

  it('takes line breaks from the rich text: <br>, paragraphs and list items', () => {
    expect(richCardText('<p>[Deflect]<br />When you play me, draw 1.</p>')).toBe('[Deflect]\nWhen you play me, draw 1.');
    expect(
      richCardText('<p>[Reaction]<br />Choose one —</p><ul><li>Counter a spell.</li><li>Draw 1.</li></ul>'),
    ).toBe('[Reaction]\nChoose one —\nCounter a spell.\nDraw 1.');
    expect(richCardText('<p>One.</p><p></p><p>Two.</p>')).toBe('One.\nTwo.');
    expect(richCardText('')).toBeNull();
    expect(richCardText(null)).toBeNull();
  });

  it('uses the rich text, entities decoded, and the plain text only when there is none', () => {
    const d = run();
    const vi = printing(d, 'UNL-229');
    expect(vi?.printed_text).not.toContain('<');
    expect(vi?.printed_text).not.toContain('&gt;');
    // Every printed text in the sample came through without tags.
    expect(d.printings.every((p) => !/<[a-z/]/i.test(p.printed_text))).toBe(true);
    // The rune has no rich text and an empty plain one.
    expect(printing(d, 'VEN-R03')?.printed_text).toBe('');
  });

  it('lets an override set the overnumbered flag', () => {
    const vi = cards.find((c) => c.riftbound_id === 'unl-187-219');
    if (!vi) throw new Error('fixture lacks unl-187-219');
    const flagged: Override = { riftcodex_id: vi.id, field: 'overnumbered', value: true, note: null };
    expect(printing(run({ overrides: [...overrides, flagged] }), 'UNL-187')?.overnumbered).toBe(true);
    expect(printing(run(), 'UNL-187')?.overnumbered).toBe(false);
  });

  it('reports overrides that match no entry', () => {
    const stale: Override = { riftcodex_id: 'nope', field: 'name', value: 'X', note: null };
    const unused = run({ overrides: [...overrides, stale] }).report.overridesUnused;
    expect(unused).toContainEqual(stale);
    // The sample holds one Metal printing and the Kennen legend; those match.
    expect(unused.map((o) => o.riftcodex_id)).not.toContain('69bc5bf1d308c64675ca89f7');
    expect(unused.map((o) => o.riftcodex_id)).not.toContain('6a56ab96ff602fd324f4761e');
  });
});

// ---------------------------------------------------------------------------

const NOW = '2026-11-02T00:00:00+00:00';
let n = 0;
const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

/** What the database would hold after applying a plan to `snapshot`. */
function applied(snapshot: CatalogSnapshot, plan: ReturnType<typeof makePlan>): CatalogSnapshot {
  const meta = { manually_edited: false, created_at: NOW, updated_at: NOW };
  const merge = <R, K extends keyof R>(rows: R[], writes: Partial<R>[], key: K): R[] => {
    const out = new Map(rows.map((r) => [r[key], r]));
    for (const w of writes) out.set(w[key] as R[K], { ...(out.get(w[key] as R[K]) ?? meta), ...w } as R);
    return [...out.values()];
  };
  const all = <W>(t: { insert: W[]; update: { row: W }[] }) => [...t.insert, ...t.update.map((u) => u.row)];
  return {
    sets: merge<SetRow, 'code'>(snapshot.sets, all(plan.sets) as Partial<SetRow>[], 'code'),
    cards: merge<CardRow, 'id'>(snapshot.cards, all(plan.cards) as Partial<CardRow>[], 'id'),
    printings: merge<PrintingRow, 'code'>(snapshot.printings, all(plan.printings) as Partial<PrintingRow>[], 'code'),
    // One row per (riftcodex_id, field), as the table's unique key.
    overrides: merge<OverrideRow, 'id'>(
      snapshot.overrides,
      all(plan.overrides).map((o) => ({ id: `${o.riftcodex_id}:${o.field}`, ...o })) as Partial<OverrideRow>[],
      'id',
    ),
  };
}

const empty: CatalogSnapshot = { sets: [], cards: [], printings: [], overrides: [] };

describe('plan', () => {
  it('inserts everything into an empty catalog, linking printings to their cards', () => {
    const desired = run();
    const plan = makePlan({ desired, current: empty, overrides, newId });
    expect(plan.stops).toEqual([]);
    expect(plan.sets.insert).toHaveLength(desired.sets.length);
    expect(plan.cards.insert).toHaveLength(desired.cards.length);
    expect(plan.printings.insert).toHaveLength(desired.printings.length);
    expect(plan.overrides.insert).toHaveLength(overrides.length);
    const ids = new Set(plan.cards.insert.map((c) => c.id));
    expect(plan.printings.insert.every((p) => ids.has(p.card_id))).toBe(true);
    expect(plan.cards.insert.every((c) => c.source === 'riftcodex')).toBe(true);
  });

  it('writes nothing on a second run with the same source', () => {
    const desired = run();
    const once = applied(empty, makePlan({ desired, current: empty, overrides, newId }));
    const again = makePlan({ desired, current: once, overrides, newId });
    expect(hasChanges(again)).toBe(false);
    expect(again.cards.unchanged).toBe(desired.cards.length);
  });

  it('updates only what changed, and never touches manually edited rows', () => {
    const desired = run();
    const once = applied(empty, makePlan({ desired, current: empty, overrides, newId }));
    const edited: CatalogSnapshot = {
      ...once,
      cards: once.cards.map((c) =>
        c.name_key === 'flash'
          ? { ...c, current_text: 'my own wording', manually_edited: true }
          : c.name_key === 'vi, piltover enforcer'
            ? { ...c, current_text: 'outdated' }
            : c,
      ),
    };
    const plan = makePlan({ desired, current: edited, overrides, newId });
    expect(plan.cards.skippedEdited).toEqual(['flash']);
    expect(plan.cards.update.map((u) => [u.row.name_key, u.changed])).toEqual([
      ['vi, piltover enforcer', ['current_text']],
    ]);
  });

  it("reports rows we didn't import as conflicts instead of overwriting them", () => {
    const desired = run();
    const once = applied(empty, makePlan({ desired, current: empty, overrides, newId }));
    const manual: CatalogSnapshot = {
      ...once,
      printings: once.printings.map((p) =>
        p.code === 'VEN-155' ? { ...p, source: 'manual', printed_text: 'spoiler text' } : p,
      ),
    };
    const plan = makePlan({ desired, current: manual, overrides, newId });
    expect(plan.printings.conflicts).toEqual([{ key: 'VEN-155', source: 'manual' }]);
    expect(plan.printings.update).toEqual([]);
  });

  it('lists rows that left the source but deletes nothing', () => {
    const desired = run();
    const once = applied(empty, makePlan({ desired, current: empty, overrides, newId }));
    const shrunk = { ...desired, printings: desired.printings.filter((p) => p.code !== 'SFD-149a') };
    const plan = makePlan({ desired: shrunk, current: once, overrides, newId });
    expect(plan.missingFromSource.printings).toEqual(['SFD-149a']);
    expect(plan.stops).toEqual([]);
  });

  it('stops on duplicate codes and on a source that shrank by more than 10%', () => {
    const dupes = makePlan({ desired: run({ overrides: [] }), current: empty, overrides: [], newId });
    expect(dupes.stops.join()).toContain('OPP-OGN-259');

    const desired = run();
    const once = applied(empty, makePlan({ desired, current: empty, overrides, newId }));
    const half = { ...desired, printings: desired.printings.slice(0, 5) };
    expect(makePlan({ desired: half, current: once, overrides, newId }).stops.join()).toContain('10%');
  });
});

describe('overrides.json', () => {
  it('is valid and has the 16 Metal codes and the Kennen / Jayce fixes', () => {
    const codes = overrides.filter((o) => o.field === 'code').map((o) => String(o.value));
    expect(codes).toHaveLength(16);
    expect(codes.every((c) => /^OPP-(OGN|OGS)-\d{3}m$/.test(c))).toBe(true);
    expect(overrides.filter((o) => o.field === 'overnumbered')).toEqual([
      expect.objectContaining({ riftcodex_id: '6a56aba0ff602fd324f47681', value: true }),
    ]);
    expect(overrides.filter((o) => o.field === 'name')).toHaveLength(3);
  });

  it('rejects malformed entries', () => {
    expect(() => parseOverrides([{ riftcodex_id: 'x', field: 'code', value: 'opp-1' }])).toThrow();
    expect(() => parseOverrides([{ riftcodex_id: 'x', field: 'colour', value: 'red' }])).toThrow();
    expect(() =>
      parseOverrides([
        { riftcodex_id: 'x', field: 'skip', value: true },
        { riftcodex_id: 'x', field: 'skip', value: true },
      ]),
    ).toThrow();
  });
});
