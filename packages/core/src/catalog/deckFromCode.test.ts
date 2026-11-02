import { describe, expect, it } from 'vitest';
import kennenCode from '../decks/__fixtures__/kennen.code.txt?raw';
import kennenText from '../decks/__fixtures__/kennen.txt?raw';
import catalogJson from './__fixtures__/catalog-kennen.json';
import { DeckCodeError, decodeDeckCode, deckCodeCanCarry, encodeDeckCode } from '../decks/deckCode';
import { formatDeckText } from '../decks/formatText';
import { parseDeckText } from '../decks/parseText';
import { isDeckList } from '../decks/validate';
import type { CardRef, DeckList } from '../types/deck';
import { deckCodeFromList, deckListFromCode, resortUnsorted } from './deckFromCode';
import { buildCatalogIndex, matchCard, type Catalog } from './match';

// The real catalog rows (from the Riftcodex snapshot) for every card in the
// Kennen deck, all printings included.
const index = buildCatalogIndex(catalogJson as Catalog);

/** A section as catalog card ids with counts — what "the same deck" means. */
const cardsBySection = (list: DeckList) => {
  const ids = (cards: (CardRef | null)[]) =>
    cards
      .filter((c): c is CardRef => c !== null)
      .map((c) => {
        const m = matchCard(c, index);
        return `${m.kind === 'unknown' ? `?${c.name}` : m.card.id}×${c.count}`;
      })
      .sort();
  return {
    legend: ids([list.legend]),
    champion: ids([list.champion]),
    main: ids(list.main),
    battlefields: ids(list.battlefields),
    runes: ids(list.runes),
    sideboard: ids(list.sideboard),
    additionalLegends: ids(list.additionalLegends),
    unsorted: ids(list.unsorted ?? []),
  };
};

describe('deck code ↔ text export (proof)', () => {
  const fromCode = deckListFromCode(decodeDeckCode(kennenCode), index);
  const fromText = parseDeckText(kennenText).list;

  it('resolve to the same deck: same cards, same counts, same sections', () => {
    expect(cardsBySection(fromCode)).toEqual(cardsBySection(fromText));
    expect(fromCode.unsorted).toBeUndefined();
  });

  it('keeps the exact printings on the code side (the alt-art Ezreal)', () => {
    expect(fromCode.main.find((c) => c.code === 'SFD-149a')).toMatchObject({ count: 2 });
    expect(fromCode.legend?.code).toBe('VEN-155');
    expect(fromCode.champion).toMatchObject({ code: 'VEN-113', count: 1 });
    // Text imports carry names only.
    expect(fromText.main.every((c) => c.code === null)).toBe(true);
  });

  it('takes the chosen champion copy out of the main deck, as the text export does', () => {
    expect(fromCode.main.some((c) => c.code === 'VEN-113')).toBe(false);
  });

  it('round-trips through a deck code', () => {
    const encoded = deckCodeFromList(fromCode, index);
    if (!('deck' in encoded)) throw new Error(`missing: ${encoded.missing.join(', ')}`);
    const again = deckListFromCode(decodeDeckCode(encodeDeckCode(encoded.deck)), index);
    expect(cardsBySection(again)).toEqual(cardsBySection(fromCode));
    expect(again.main.find((c) => c.code === 'SFD-149a')).toBeDefined();
  });

  it('writes a code for a text import, using each card’s base printing', () => {
    const encoded = deckCodeFromList(fromText, index);
    if (!('deck' in encoded)) throw new Error(`missing: ${encoded.missing.join(', ')}`);
    const back = deckListFromCode(decodeDeckCode(encodeDeckCode(encoded.deck)), index);
    expect(cardsBySection(back)).toEqual(cardsBySection(fromText));
  });
});

describe('unknown codes', () => {
  const decoded = decodeDeckCode(kennenCode);
  const withNew = {
    ...decoded,
    cards: [...decoded.cards, { code: 'RAD-012', count: 2 }],
  };

  it('go to their own unsorted bucket, named by code', () => {
    const list = deckListFromCode(withNew, index);
    expect(list.unsorted).toEqual([{ name: 'RAD-012', code: 'RAD-012', count: 2 }]);
    expect(isDeckList(list)).toBe(true);
  });

  it('keep the champion slot even when the champion is unknown', () => {
    const list = deckListFromCode({ ...decoded, chosenChampion: 'RAD-099', cards: [...decoded.cards, { code: 'RAD-099', count: 3 }] }, index);
    expect(list.champion).toEqual({ name: 'RAD-099', code: 'RAD-099', count: 1 });
    expect(list.unsorted).toEqual([{ name: 'RAD-099', code: 'RAD-099', count: 2 }]);
  });

  it('move into their section on screen once the catalog knows them', () => {
    const list = deckListFromCode(withNew, index);
    // Pretend RAD-012 arrived as a battlefield.
    const later = buildCatalogIndex({
      ...(catalogJson as Catalog),
      cards: [...(catalogJson as Catalog).cards, { ...(catalogJson as Catalog).cards[0]!, id: 'card:new', name: 'New Field', name_key: 'new field', type: 'Battlefield' }],
      printings: [...(catalogJson as Catalog).printings, { ...(catalogJson as Catalog).printings[0]!, code: 'RAD-012', card_id: 'card:new', set_code: 'RAD' }],
    });
    const shown = resortUnsorted(list, later);
    expect(shown.unsorted).toBeUndefined();
    expect(shown.battlefields.at(-1)).toEqual({ name: 'New Field', code: 'RAD-012', count: 2 });
    // The stored list isn't touched.
    expect(list.unsorted).toHaveLength(1);
  });

  it('survive editing as text: "Unsorted:" keeps their codes', () => {
    const list = deckListFromCode(withNew, index);
    const reparsed = parseDeckText(formatDeckText(list));
    expect(reparsed.list.unsorted).toEqual([{ name: 'RAD-012', code: 'RAD-012', count: 2 }]);
    expect(reparsed.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('are kept when writing a code; cards with no printing at all are named', () => {
    const list = deckListFromCode(withNew, index);
    const encoded = deckCodeFromList(list, index);
    expect('deck' in encoded && encoded.deck.cards).toContainEqual({ code: 'RAD-012', count: 2 });
    const unknownByName = { ...list, sideboard: [...list.sideboard, { name: 'Not A Card', code: null, count: 1 }] };
    expect(deckCodeFromList(unknownByName, index)).toEqual({ missing: ['Not A Card'] });
  });
});

describe('decoding errors', () => {
  it('rejects things that are not deck codes', () => {
    expect(() => decodeDeckCode('hello')).toThrow(DeckCodeError);
    try {
      decodeDeckCode('AAAAAAAAAAAAAAAAAAAA');
    } catch (e) {
      expect((e as DeckCodeError).kind).toBe('invalid');
    }
  });

  it('tells a code from a newer format apart', () => {
    // Version 15 in the header byte (this library knows up to 6).
    const newer = `D4${kennenCode.trim().slice(2)}`;
    try {
      decodeDeckCode(newer);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(DeckCodeError);
      expect((e as DeckCodeError).kind).toBe('newer_format');
    }
  });

  it('knows which printings a deck code can carry', () => {
    for (const code of ['SFD-149', 'SFD-149a', 'UNL-229*', 'VEN-R01', 'VEN-SP1', 'OGS-011']) {
      expect(deckCodeCanCarry(code), code).toBe(true);
    }
    for (const code of ['OPP-OGN-259m', 'OPP-SFD-086', 'PR-OGN-246b', 'SFD-T03', 'XYZ-001']) {
      expect(deckCodeCanCarry(code), code).toBe(false);
    }
  });
});
