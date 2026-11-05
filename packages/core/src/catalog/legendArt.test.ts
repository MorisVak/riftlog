import { describe, expect, it } from 'vitest';
import { buildCatalogIndex, type Catalog, type CatalogPrinting } from './match';
import { legendArtPrinting, NO_LEGEND_ART, parseLegendArt } from './legendArt';

const card = (id: string, name: string, type: string) => ({
  id, name, name_key: name.toLowerCase(), type, supertype: null, domains: [], energy: null,
  might: null, power: null, tags: [], current_text: '', status: 'released' as const,
});
const printing = (code: string, card_id: string, extra: Partial<CatalogPrinting> = {}): CatalogPrinting => ({
  code, card_id, set_code: 'OGN', variant: '', alt_art: false, overnumbered: false, signed: false,
  promo: false, image_url: `https://img/${code}`, storage_path: null, orientation: 'portrait',
  artist: null, rarity: null, status: 'released', ...extra,
});

const catalog: Catalog = {
  version: 1,
  sets: [{ code: 'OGN', name: 'Origins', released_on: '2025-10-31', deck_code_set_id: 0, status: 'released' }],
  cards: [card('ahri', 'Ahri - Nine-Tailed Fox', 'Legend'), card('gust', 'Gust', 'Spell')],
  printings: [
    printing('OGN-255', 'ahri'),
    printing('OGN-303', 'ahri', { overnumbered: true }),
    printing('OGN-303*', 'ahri', { variant: '*', signed: true }),
    printing('OGN-169', 'gust'),
    printing('OGN-169a', 'gust', { overnumbered: true }),
  ],
};
const index = buildCatalogIndex(catalog);
const ahri = index.cardById.get('ahri')!;
const gust = index.cardById.get('gust')!;
const base = index.printingByCode.get('OGN-255')!;

describe('legendArtPrinting', () => {
  it('keeps the deck printing with no preference', () => {
    expect(legendArtPrinting(ahri, base, NO_LEGEND_ART, index)?.code).toBe('OGN-255');
  });
  it('prefers the plain overnumbered art (not the signed copy) with the toggle', () => {
    expect(legendArtPrinting(ahri, base, { ...NO_LEGEND_ART, overnumbered: true }, index)?.code).toBe('OGN-303');
  });
  it('a per-legend pick wins over the toggle', () => {
    const pref = { overnumbered: true, picks: { ahri: 'OGN-303*' }, decklists: true };
    expect(legendArtPrinting(ahri, base, pref, index)?.code).toBe('OGN-303*');
  });
  it('replaces only the standard art: a deck with a special printing keeps it', () => {
    const signed = index.printingByCode.get('OGN-303*')!;
    const pref = { overnumbered: true, picks: { ahri: 'OGN-255' }, decklists: true };
    expect(legendArtPrinting(ahri, signed, pref, index)?.code).toBe('OGN-303*');
  });
  it('applies with no printing known (a text import not yet matched to one)', () => {
    expect(legendArtPrinting(ahri, null, { ...NO_LEGEND_ART, overnumbered: true }, index)?.code).toBe('OGN-303');
  });
  it('ignores a pick that names another card or an unknown code', () => {
    expect(legendArtPrinting(ahri, base, { ...NO_LEGEND_ART, picks: { ahri: 'OGN-169' } }, index)?.code).toBe('OGN-255');
    expect(legendArtPrinting(ahri, base, { ...NO_LEGEND_ART, picks: { ahri: 'XXX-1' } }, index)?.code).toBe('OGN-255');
  });
  it('never touches non-legends', () => {
    const g = index.printingByCode.get('OGN-169')!;
    expect(legendArtPrinting(gust, g, { ...NO_LEGEND_ART, overnumbered: true }, index)?.code).toBe('OGN-169');
  });
});

describe('parseLegendArt', () => {
  it('reads the stored shape and drops junk', () => {
    expect(parseLegendArt({ overnumbered: true, picks: { a: 'X-1', b: 3, c: '' } })).toEqual({
      overnumbered: true,
      picks: { a: 'X-1' },
      decklists: true,
    });
    expect(parseLegendArt({ decklists: false }).decklists).toBe(false);
    expect(parseLegendArt(null)).toEqual(NO_LEGEND_ART);
    expect(parseLegendArt([])).toEqual(NO_LEGEND_ART);
    expect(parseLegendArt({})).toEqual(NO_LEGEND_ART);
  });
});
