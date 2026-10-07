import { describe, expect, it } from 'vitest';
import kennenText from './__fixtures__/kennen.txt?raw';
import { parseDeckText } from './parseText';
import { emptyDeckList } from './sections';
import { isDeckList } from './validate';

describe('isDeckList', () => {
  it('accepts parser output, including after a JSON round trip', () => {
    const { list } = parseDeckText(kennenText);
    expect(isDeckList(list)).toBe(true);
    expect(isDeckList(JSON.parse(JSON.stringify(list)))).toBe(true);
    expect(isDeckList(emptyDeckList())).toBe(true);
  });

  it('rejects missing sections and malformed cards', () => {
    const { additionalLegends: _omit, ...partial } = emptyDeckList();
    expect(isDeckList(partial)).toBe(false);
    expect(isDeckList({ ...emptyDeckList(), main: [{ name: 'Gust', count: 3 }] })).toBe(false);
    expect(isDeckList({ ...emptyDeckList(), main: [{ name: 'Gust', code: null, count: 0 }] })).toBe(false);
    expect(isDeckList(null)).toBe(false);
    expect(isDeckList('Legend:')).toBe(false);
  });
});
