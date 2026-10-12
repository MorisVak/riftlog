import { describe, expect, it } from 'vitest';
import kennenText from './__fixtures__/kennen.txt?raw';
import { diffDeckLists } from './diff';
import { parseDeckText } from './parseText';
import { emptyDeckList } from './sections';
import type { DeckList } from '../types/deck';

const card = (count: number, name: string) => ({ name, code: null, count });

describe('diffDeckLists', () => {
  it('is empty for the same list', () => {
    const { list } = parseDeckText(kennenText);
    expect(diffDeckLists(list, structuredClone(list))).toEqual([]);
  });

  it('reports changed, added and removed cards per section', () => {
    const before: DeckList = {
      ...emptyDeckList(),
      main: [card(3, 'Defy'), card(1, 'Rebuke'), card(2, 'Tideturner')],
      runes: [card(6, 'Calm Rune'), card(6, 'Chaos Rune')],
    };
    const after: DeckList = {
      ...emptyDeckList(),
      main: [card(2, 'Defy'), card(2, 'Tideturner'), card(2, 'Gust')],
      runes: [card(7, 'Calm Rune'), card(5, 'Chaos Rune')],
    };
    expect(diffDeckLists(before, after)).toEqual([
      {
        section: 'main',
        changes: [
          { name: 'Defy', before: 3, after: 2 },
          { name: 'Gust', before: 0, after: 2 },
          { name: 'Rebuke', before: 1, after: 0 },
        ],
      },
      {
        section: 'runes',
        changes: [
          { name: 'Calm Rune', before: 6, after: 7 },
          { name: 'Chaos Rune', before: 6, after: 5 },
        ],
      },
    ]);
  });

  it('treats a swapped legend or champion as one out, one in', () => {
    const before = { ...emptyDeckList(), legend: card(1, 'Vex, Gloomist') };
    const after = { ...emptyDeckList(), legend: card(1, 'Kennen, Heart of the Tempest') };
    expect(diffDeckLists(before, after)).toEqual([
      {
        section: 'legend',
        changes: [
          { name: 'Kennen, Heart of the Tempest', before: 0, after: 1 },
          { name: 'Vex, Gloomist', before: 1, after: 0 },
        ],
      },
    ]);
  });

  it('matches names ignoring case and spacing, and sums duplicate lines', () => {
    const before = { ...emptyDeckList(), main: [card(2, 'Defy'), card(1, 'Defy')] };
    const after = { ...emptyDeckList(), main: [card(3, ' defy ')] };
    expect(diffDeckLists(before, after)).toEqual([]);
  });
});
