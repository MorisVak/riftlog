import { describe, expect, it } from 'vitest';
import sample from './__fixtures__/gallery-sample.json';
import { galleryToEntries, parseGalleryHtml } from './gallery';
import { makePlan, type CatalogSnapshot } from './plan';
import { transform } from './transform';

const items = sample.items as unknown[];
const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: { pageProps: { page: { blades: [{ type: 'hero' }, { cards: { items } }] } } },
})}</script></body></html>`;

const run = (onlySets?: string[]) => {
  const entries = galleryToEntries(parseGalleryHtml(html), { onlySets });
  return transform({ ...entries, overrides: [], today: '2026-11-04', keepRiftcodexIds: false });
};
const printing = (d: ReturnType<typeof run>, code: string) => d.printings.find((p) => p.code === code);
const card = (d: ReturnType<typeof run>, key: string) => d.cards.find((c) => c.name_key === key);

describe('gallery page', () => {
  it('finds the card items embedded in the page', () => {
    expect(parseGalleryHtml(html)).toHaveLength(items.length);
    expect(() => parseGalleryHtml('<html></html>')).toThrow(/__NEXT_DATA__/);
  });
});

describe('gallery entries', () => {
  it('maps gallery ids to printing codes', () => {
    const d = run(['RAD', 'SFD']);
    expect(printing(d, 'RAD-043')).toBeDefined();
    expect(printing(d, 'RAD-021a')).toMatchObject({ variant: 'a', alt_art: true });
    expect(printing(d, 'RAD-R01')).toMatchObject({ collector_number: 'R01' });
    expect(printing(d, 'RAD-R01a')).toMatchObject({ alt_art: true });
    expect(printing(d, 'RAD-SP1')).toBeDefined();
    // "-star" is the signed printing.
    expect(printing(d, 'SFD-227*')).toMatchObject({ variant: '*', signed: true });
  });

  it('names legends "Champion - Title" and units "Name - Subtitle"', () => {
    const d = run();
    expect(card(d, 'riven, the exile')).toMatchObject({ name: 'Riven - The Exile', type: 'Legend' });
    expect(card(d, 'riven, broken blade')).toMatchObject({ name: 'Riven - Broken Blade', type: 'Unit' });
    // The overnumbered legend joins the same card and isn't its base printing.
    expect(printing(d, 'RAD-173')).toMatchObject({ name_key: 'riven, the exile', overnumbered: true });
    expect(printing(d, 'RAD-149')).toMatchObject({ overnumbered: false });
  });

  it("reads a missing card type from the image's accessibility text", () => {
    // Riot's data has an empty type list on Hunker Down.
    expect(card(run(), 'hunker down')).toMatchObject({ type: 'Spell' });
  });

  it('keeps both domains of a dual-domain card, and colorless', () => {
    const d = run();
    expect(d.cards.some((c) => c.domains.length === 2)).toBe(true);
    expect(d.cards.some((c) => c.domains.includes('Colorless'))).toBe(true);
    expect(d.cards.every((c) => c.domains.every((x) => /^[A-Z]/.test(x)))).toBe(true);
  });

  it('appends an equipment card’s Effect text and decodes the rich text', () => {
    const p = printing(run(), 'RAD-150');
    expect(p?.printed_text).toContain('[Equip]');
    expect(p?.printed_text).toContain('[Ganking]');
    expect(p?.printed_text).not.toMatch(/<\/?p>/);
  });

  it('keeps landscape battlefields, image URLs on Riot’s CDN, and no Riftcodex ids', () => {
    const d = run();
    expect(d.printings.some((p) => p.orientation === 'landscape')).toBe(true);
    expect(d.printings.every((p) => p.image_url?.startsWith('https://cmsassets.rgpub.io/'))).toBe(true);
    expect(d.printings.every((p) => p.riftcodex_id === null)).toBe(true);
  });

  it('takes only the asked-for sets, skips tokens and dates the set', () => {
    const d = run(['RAD']);
    expect(d.printings.every((p) => p.set_code === 'RAD')).toBe(true);
    expect(d.sets).toEqual([expect.objectContaining({ code: 'RAD', name: 'Radiance', released_on: '2026-10-23', deck_code_set_id: 6, status: 'released' })]);
    const all = run(['UNL']);
    expect(all.printings).toEqual([]);
    expect(all.report.skipped.map((s) => s.riftbound_id)).toEqual(['unl-t01']);
  });
});

describe('gallery plan', () => {
  it("writes as 'riot' and leaves Riftcodex rows alone", () => {
    const d = run();
    const riftcodexRiven = {
      id: 'existing',
      name: 'Riven - Broken Blade',
      name_key: 'riven, broken blade',
      type: 'Unit' as const,
      supertype: null,
      domains: ['Calm'],
      energy: 1,
      might: 1,
      power: null,
      tags: [],
      current_text: 'old',
      source: 'riftcodex' as const,
      manually_edited: false,
      status: 'released' as const,
      created_at: '',
      updated_at: '',
    };
    const current: CatalogSnapshot = { sets: [], cards: [riftcodexRiven], printings: [], overrides: [] };
    let n = 0;
    const plan = makePlan({ desired: d, current, overrides: [], newId: () => `id-${++n}`, source: 'riot' });
    expect(plan.cards.insert.every((c) => c.source === 'riot')).toBe(true);
    expect(plan.printings.insert.every((p) => p.source === 'riot')).toBe(true);
    // The existing Riftcodex card is reported, not overwritten; its printing still attaches to it.
    expect(plan.cards.conflicts).toEqual([{ key: 'riven, broken blade', source: 'riftcodex' }]);
    expect(plan.printings.insert.find((p) => p.code === 'RAD-043')?.card_id).toBe('existing');
    expect(plan.overrides.insert).toEqual([]);
    expect(plan.stops).toEqual([]);
  });
});
