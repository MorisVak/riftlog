import type { CardRef, DeckList } from '../types/deck';

/**
 * The inverse of `parseDeckText`: a list back to the plain-text export format.
 * Empty sections are omitted. Additional legends follow the legend under the
 * same header, which is where the parser reads them from.
 */
export function formatDeckText(list: DeckList): string {
  const blocks: string[] = [];
  const block = (header: string, cards: readonly (CardRef | null)[]) => {
    const present = cards.filter((c): c is CardRef => c !== null);
    if (present.length === 0) return;
    blocks.push(
      [`${header}:`, ...present.map((c) => `${c.count} ${c.name}`)].join('\n'),
    );
  };

  block('Legend', [list.legend, ...list.additionalLegends]);
  block('Champion', [list.champion]);
  block('MainDeck', list.main);
  block('Battlefields', list.battlefields);
  block('Runes', list.runes);
  block('Sideboard', list.sideboard);

  return blocks.join('\n\n');
}
