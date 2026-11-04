import { describe, expect, it } from 'vitest';
import kennenCode from './__fixtures__/kennen.code.txt?raw';
import catalogJson from '../catalog/__fixtures__/catalog-kennen.json';
import { buildCatalogIndex, type Catalog } from '../catalog/match';
import { deckListFromCode } from '../catalog/deckFromCode';
import { decodeDeckCode } from './deckCode';
import { formatDeckText } from './formatText';
import { parseDeckText } from './parseText';
import { printingsKey, withPrintingsFrom } from './printings';
import { emptyDeckList } from './sections';
import type { DeckList } from '../types/deck';

const index = buildCatalogIndex(catalogJson as Catalog);

describe('withPrintingsFrom', () => {
  const fromCode = deckListFromCode(decodeDeckCode(kennenCode), index);
  const asText = parseDeckText(formatDeckText(fromCode)).list;

  it('puts a code-imported deck back together after a round trip through text', () => {
    expect(printingsKey(asText)).not.toBe(printingsKey(fromCode));
    expect(printingsKey(withPrintingsFrom(asText, fromCode))).toBe(printingsKey(fromCode));
  });

  it('keeps printings of cards still in the deck; new cards get none', () => {
    const edited = parseDeckText(`${formatDeckText(fromCode)}\nSideboard:\n1 Brand New Card\n`).list;
    const out = withPrintingsFrom(edited, fromCode);
    expect(out.legend?.code).toBe(fromCode.legend?.code);
    expect(out.sideboard.find((c) => c.name === 'Brand New Card')?.code).toBeNull();
  });

  it('hands out several printings of one name in order, then repeats the first', () => {
    const from: DeckList = {
      ...emptyDeckList(),
      main: [
        { name: 'Riven, Broken Blade', code: 'RAD-043a', count: 1 },
        { name: 'Riven - Broken Blade', code: 'RAD-043', count: 2 },
      ],
    };
    const list: DeckList = {
      ...emptyDeckList(),
      main: [
        { name: 'Riven, Broken Blade', code: null, count: 1 },
        { name: 'Riven, Broken Blade', code: null, count: 2 },
      ],
      sideboard: [{ name: 'Riven, Broken Blade', code: null, count: 1 }],
    };
    const out = withPrintingsFrom(list, from);
    expect(out.main.map((c) => c.code)).toEqual(['RAD-043a', 'RAD-043']);
    expect(out.sideboard[0]?.code).toBe('RAD-043a');
  });

  it('leaves cards that already carry a code alone', () => {
    const from: DeckList = { ...emptyDeckList(), main: [{ name: 'X', code: 'OGN-001', count: 1 }] };
    const list: DeckList = { ...emptyDeckList(), main: [{ name: 'X', code: 'OGN-001a', count: 1 }] };
    expect(withPrintingsFrom(list, from).main[0]?.code).toBe('OGN-001a');
  });
});
