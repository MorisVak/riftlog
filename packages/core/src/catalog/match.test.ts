import { describe, expect, it } from 'vitest';
import kennenText from '../decks/__fixtures__/kennen.txt?raw';
import { parseDeckText } from '../decks/parseText';
import { buildCatalogIndex, cardIssue, checkDeckList, matchCard, type Catalog, type CatalogPrinting } from './match';

const set = (code: string, released_on: string, id: number | null) =>
  ({ code, name: code, released_on, deck_code_set_id: id, status: 'released' }) as const;
const card = (id: string, name: string, name_key: string, type: string) => ({
  id, name, name_key, type, supertype: null, domains: [], energy: null, might: null, power: null,
  current_text: '', status: 'released' as const,
});
const printing = (code: string, card_id: string, extra: Partial<CatalogPrinting> = {}): CatalogPrinting => ({
  code, card_id, set_code: code.split('-')[0] ?? '', variant: '', alt_art: false, overnumbered: false,
  signed: false, promo: false, image_url: null, storage_path: null, orientation: 'portrait', artist: null,
  status: 'released', ...extra,
});

const catalog: Catalog = {
  version: 7,
  sets: [set('SFD', '2026-02-13', 3), set('VEN', '2026-07-31', 5), set('OGN', '2025-10-31', 0)],
  cards: [
    card('ez', 'Ezreal - Prodigy', 'ezreal, prodigy', 'Unit'),
    card('zw', 'Zaun Warrens', 'zaun warrens', 'Battlefield'),
    card('gust', 'Gust', 'gust', 'Spell'),
  ],
  printings: [
    printing('SFD-149', 'ez'),
    printing('SFD-149a', 'ez', { variant: 'a', alt_art: true }),
    printing('VEN-SP5', 'ez'),
    printing('OGN-298', 'zw', { orientation: 'landscape' }),
    printing('OGN-169', 'gust'),
  ],
};
const index = buildCatalogIndex(catalog);

describe('matchCard', () => {
  it('matches the exact printing by code', () => {
    const m = matchCard({ name: 'Ezreal, Prodigy', code: 'SFD-149a' }, index);
    expect(m).toMatchObject({ kind: 'matched', by: 'code', printing: { code: 'SFD-149a' } });
  });

  it("matches a name-only card to its card's base printing", () => {
    const m = matchCard({ name: 'Ezreal, Prodigy', code: null }, index);
    expect(m).toMatchObject({ kind: 'matched', by: 'name', card: { id: 'ez' }, printing: { code: 'VEN-SP5' } });
  });

  it('falls back to the name when the code is not in the catalog', () => {
    expect(matchCard({ name: 'Gust', code: 'OGN-999' }, index)).toMatchObject({ kind: 'matched', by: 'name' });
  });

  it('flags a code and a name that point to different cards', () => {
    expect(matchCard({ name: 'Gust', code: 'SFD-149' }, index)).toMatchObject({
      kind: 'conflict', listedAs: 'Gust', card: { id: 'ez' },
    });
  });

  it("matches names whose apostrophe sits elsewhere, but never guesses between cards", () => {
    const withCircle = buildCatalogIndex({
      ...catalog,
      cards: [...catalog.cards, card('hc', "Hunters' Circle", "hunters' circle", 'Battlefield')],
      printings: [...catalog.printings, printing('RAD-163', 'hc')],
    });
    expect(matchCard({ name: "Hunter's Circle", code: null }, withCircle)).toMatchObject({ kind: 'matched', card: { id: 'hc' } });
    const clash = buildCatalogIndex({
      ...catalog,
      cards: [...catalog.cards, card('a', "A's B", "a's b", 'Spell'), card('b', "As' B", "as' b", 'Spell')],
      printings: [],
    });
    expect(matchCard({ name: 'As B', code: null }, clash)).toEqual({ kind: 'unknown' });
  });

  it('reports unknown cards', () => {
    expect(matchCard({ name: 'Not A Card', code: null }, index)).toEqual({ kind: 'unknown' });
  });
});

describe('deck checks', () => {
  it('flags a card in the wrong section, by type', () => {
    const zaun = matchCard({ name: 'Zaun Warrens', code: null }, index);
    expect(cardIssue(zaun, 'battlefields')).toBeNull();
    expect(cardIssue(zaun, 'main')).toEqual({ kind: 'misplaced', type: 'Battlefield' });
  });

  it('counts unknown, conflicting and misplaced cards in a deck', () => {
    const { list } = parseDeckText(kennenText);
    const check = checkDeckList(list, index);
    // The tiny test catalog knows 3 Kennen-deck cards; the rest are unknown.
    expect(check.conflicts).toBe(0);
    expect(check.misplaced).toBe(0);
    expect(check.unknown).toBeGreaterThan(20);
  });
});
