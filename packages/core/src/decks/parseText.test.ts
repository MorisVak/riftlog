import { describe, expect, it } from 'vitest';
import kennenText from './__fixtures__/kennen.txt?raw';
import kennenCode from './__fixtures__/kennen.code.txt?raw';
import { parseDeckText, type DeckDiagnosticCode } from './parseText';
import { formatDeckText } from './formatText';
import { sectionTotals } from './sections';
import { looksLikeDeckCode } from './deckCode';
import { deckDomains, domainFromRuneName } from './domains';

const codes = (input: string): DeckDiagnosticCode[] =>
  parseDeckText(input).diagnostics.map((d) => d.code);

/** A minimal legal list, for tests that tweak one thing. */
const legal = (overrides: Partial<Record<string, string>> = {}): string =>
  [
    overrides.legend ?? 'Legend:\n1 Kennen, Heart of the Tempest',
    overrides.champion ?? 'Champion:\n1 Kennen, Storm of Shuriken',
    overrides.main ?? 'MainDeck:\n39 Gust',
    overrides.battlefields ?? 'Battlefields:\n1 Minefield\n1 Zaun Warrens\n1 Shadow Temple',
    overrides.runes ?? 'Runes:\n9 Chaos Rune\n3 Order Rune',
    overrides.sideboard ?? 'Sideboard:\n1 Rebuke',
  ].join('\n\n');

describe('parseDeckText — the Kennen fixture', () => {
  const { list, diagnostics } = parseDeckText(kennenText);

  it('parses with no diagnostics at all', () => {
    expect(diagnostics).toEqual([]);
  });

  it('fills each section', () => {
    expect(list.legend).toEqual({
      name: 'Kennen, Heart of the Tempest',
      code: null,
      count: 1,
    });
    expect(list.champion?.name).toBe('Kennen, Storm of Shuriken');
    expect(list.main).toHaveLength(20);
    expect(list.battlefields.map((c) => c.name)).toEqual([
      'Zaun Warrens',
      'Minefield',
      'Shadow Temple',
    ]);
    expect(list.runes).toEqual([
      { name: 'Chaos Rune', code: null, count: 9 },
      { name: 'Order Rune', code: null, count: 3 },
    ]);
    expect(list.additionalLegends).toEqual([]);
  });

  it('keeps names with commas whole and preserves import order', () => {
    expect(list.main[0]?.name).toBe('Traveling Merchant');
    expect(list.main.at(-2)?.name).toBe('Fizz, Trickster');
    expect(list.main.at(-1)?.name).toBe('Ezreal, Prodigy');
    expect(list.sideboard.map((c) => c.name)).toContain('Vi, Peacekeeper');
  });

  it('totals 39 + the chosen champion = 40, 12 runes, 3 battlefields, 10 sideboard', () => {
    expect(list.main.reduce((n, c) => n + c.count, 0)).toBe(39);
    expect(sectionTotals(list)).toEqual({
      main: 40,
      runes: 12,
      battlefields: 3,
      sideboard: 10,
    });
  });

  it('never gives a card a printing code from text', () => {
    const all = [
      list.legend,
      list.champion,
      ...list.main,
      ...list.battlefields,
      ...list.runes,
      ...list.sideboard,
    ];
    expect(all.every((c) => c?.code === null)).toBe(true);
  });
});

describe('parseDeckText — tolerance', () => {
  it('accepts header spellings in any case, with or without a colon', () => {
    const variants = [
      'legend',
      'LEGENDS:',
      '  Legend :  ',
      'Main Deck',
      'main:',
      'MAINDECK',
      'Side Deck:',
      'sideboard',
      'Battlefield',
      'rune:',
      'Chosen Champion',
    ];
    for (const header of variants) {
      const input = `${header}\n1 Gust`;
      expect(codes(input)).not.toContain('unknown_section');
      expect(codes(input)).not.toContain('unparseable_line');
    }
  });

  it('accepts both "3 Name" and "3x Name"', () => {
    const { list } = parseDeckText('MainDeck:\n3x Gust\n2X Flash\n1 Salvage');
    expect(list.main).toEqual([
      { name: 'Gust', code: null, count: 3 },
      { name: 'Flash', code: null, count: 2 },
      { name: 'Salvage', code: null, count: 1 },
    ]);
  });

  it('handles CRLF, blank lines and stray whitespace', () => {
    const crlf = kennenText.replace(/\n/g, '\r\n');
    expect(parseDeckText(crlf)).toEqual(parseDeckText(kennenText));

    const messy = '\n\n   MainDeck:   \n\n\t3   Gust  \n   \n';
    expect(parseDeckText(messy).list.main).toEqual([
      { name: 'Gust', code: null, count: 3 },
    ]);
  });

  it('merges duplicate lines within a section, keeping the first spelling', () => {
    const { list } = parseDeckText('MainDeck:\n2 Gust\n1 gust\n1  GUST ');
    expect(list.main).toEqual([{ name: 'Gust', code: null, count: 4 }]);
  });

  it('does not merge the same card across sections', () => {
    const { list } = parseDeckText('MainDeck:\n1 Gust\n\nSideboard:\n1 Gust');
    expect(list.main).toHaveLength(1);
    expect(list.sideboard).toHaveLength(1);
  });

  it('reports errors with the 1-based line they came from', () => {
    const input = 'MainDeck:\n3 Gust\nGust\n0 Flash';
    const { diagnostics, list } = parseDeckText(input);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([
      expect.objectContaining({ line: 3, code: 'unparseable_line', section: 'main' }),
      expect.objectContaining({ line: 4, code: 'invalid_count', section: 'main' }),
    ]);
    expect(list.main).toEqual([{ name: 'Gust', code: null, count: 3 }]);
  });

  it('flags a card before any header', () => {
    const { diagnostics } = parseDeckText('3 Gust\nMainDeck:\n1 Flash');
    expect(diagnostics[0]).toEqual(
      expect.objectContaining({ line: 1, code: 'line_outside_section' }),
    );
  });

  it('skips an unknown section with one error on its header', () => {
    const input = 'Tokens:\n2 Some Token\n\nMainDeck:\n1 Gust';
    const { diagnostics, list } = parseDeckText(input);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([
      expect.objectContaining({ line: 1, code: 'unknown_section' }),
    ]);
    expect(list.main).toEqual([{ name: 'Gust', code: null, count: 1 }]);
  });
});

describe('parseDeckText — warnings', () => {
  it('a legal list has none', () => {
    expect(codes(legal())).toEqual([]);
  });

  it('warns on wrong main / runes / battlefield counts, never errors', () => {
    const { diagnostics } = parseDeckText(
      legal({
        main: 'MainDeck:\n38 Gust',
        runes: 'Runes:\n11 Chaos Rune',
        battlefields: 'Battlefields:\n1 Minefield',
      }),
    );
    expect(diagnostics.map((d) => [d.code, d.severity, d.line])).toEqual([
      ['main_count', 'warning', null],
      ['runes_count', 'warning', null],
      ['battlefields_count', 'warning', null],
    ]);
  });

  it('does not check the sideboard size', () => {
    expect(codes(legal({ sideboard: 'Sideboard:\n10 Rebuke' }))).toEqual([]);
    expect(codes(legal({ sideboard: '' }))).toEqual([]);
  });

  it('warns about a missing legend or champion', () => {
    expect(codes(legal({ legend: '' }))).toContain('missing_legend');
    expect(codes(legal({ champion: '' }))).toContain('missing_champion');
  });

  it('keeps extra legends as additional legends, with a warning', () => {
    const { list, diagnostics } = parseDeckText(
      legal({ legend: 'Legend:\n1 Kennen, Heart of the Tempest\n1 Jinx, Loose Cannon' }),
    );
    expect(list.legend?.name).toBe('Kennen, Heart of the Tempest');
    expect(list.additionalLegends.map((c) => c.name)).toEqual(['Jinx, Loose Cannon']);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: 'extra_legend', line: 3, severity: 'warning' }),
    ]);
  });

  it('moves a second champion line into the main deck, with a warning', () => {
    const { list, diagnostics } = parseDeckText(
      legal({
        champion: 'Champion:\n1 Kennen, Storm of Shuriken\n1 Ezreal, Prodigy',
        main: 'MainDeck:\n38 Gust',
      }),
    );
    expect(list.champion?.name).toBe('Kennen, Storm of Shuriken');
    expect(list.main.at(-1)?.name).toBe('Ezreal, Prodigy');
    expect(sectionTotals(list).main).toBe(40);
    expect(diagnostics.map((d) => d.code)).toEqual(['extra_champion']);
  });

  it('warns when the legend or champion has more than one copy', () => {
    expect(codes(legal({ legend: 'Legend:\n2 Kennen, Heart of the Tempest' }))).toEqual([
      'legend_count',
    ]);
  });
});

describe('formatDeckText', () => {
  it('reproduces the fixture exactly', () => {
    const { list } = parseDeckText(kennenText);
    expect(formatDeckText(list)).toBe(kennenText.trim());
  });

  it('round-trips: parse(format(list)) is the same list', () => {
    const { list } = parseDeckText(kennenText);
    const again = parseDeckText(formatDeckText(list));
    expect(again.list).toEqual(list);
    expect(again.diagnostics).toEqual([]);
  });

  it('round-trips additional legends and omits empty sections', () => {
    const { list } = parseDeckText(
      'Legend:\n1 Kennen, Heart of the Tempest\n1 Jinx, Loose Cannon\n\nRunes:\n12 Chaos Rune',
    );
    const text = formatDeckText(list);
    expect(text).not.toContain('Sideboard');
    expect(parseDeckText(text).list).toEqual(list);
  });
});

describe('looksLikeDeckCode', () => {
  it('recognises the Piltover Archive code fixture', () => {
    expect(looksLikeDeckCode(kennenCode)).toBe(true);
    expect(looksLikeDeckCode(`  ${kennenCode.trim()}\n`)).toBe(true);
  });

  it('rejects text decklists and short words', () => {
    expect(looksLikeDeckCode(kennenText)).toBe(false);
    expect(looksLikeDeckCode('MAINDECK')).toBe(false);
    expect(looksLikeDeckCode('ABCD EFGH IJKL MNOP QRST')).toBe(false);
    expect(looksLikeDeckCode('cmaaaaabaeaabjqbaaaaaaaa')).toBe(false);
  });

  it('would otherwise parse as an error, which is why the UI checks first', () => {
    expect(codes(kennenCode)).toContain('unparseable_line');
  });
});

describe('domains', () => {
  it('maps "<Domain> Rune" names', () => {
    expect(domainFromRuneName('Chaos Rune')).toBe('chaos');
    expect(domainFromRuneName(' order rune ')).toBe('order');
    expect(domainFromRuneName('Rune of Chaos')).toBeNull();
  });

  it('derives the fixture domains in rune order', () => {
    expect(deckDomains(parseDeckText(kennenText).list)).toEqual([
      { domain: 'chaos', count: 9 },
      { domain: 'order', count: 3 },
    ]);
  });

  it('returns null when any rune name does not match, or there are none', () => {
    expect(deckDomains(parseDeckText('Runes:\n9 Chaos Rune\n3 Shiny Rock').list)).toBeNull();
    expect(deckDomains(parseDeckText('MainDeck:\n1 Gust').list)).toBeNull();
  });
});
