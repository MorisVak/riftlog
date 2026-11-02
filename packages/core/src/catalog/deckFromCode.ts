/**
 * Between deck codes and DeckLists. A deck code carries printings without
 * sections, so sorting needs each card's type from the catalog; a DeckList
 * from a text import carries names without codes, so writing a code needs
 * each card's printing from the catalog.
 */
import { deckCodeCanCarry, type DecodedDeck, type DeckCodeCard } from '../decks/deckCode';
import type { CardRef, DeckList } from '../types/deck';
import { emptyDeckList } from '../decks/sections';
import { matchCard, type CatalogIndex } from './match';

type Placed = 'legend' | 'main' | 'battlefields' | 'runes' | 'unsorted';

/** Where a card of this type goes when nothing else says. */
const sectionFor = (type: string): Placed =>
  type === 'Legend'
    ? 'legend'
    : type === 'Battlefield'
      ? 'battlefields'
      : type === 'Rune'
        ? 'runes'
        : 'main';

/** The catalog's view of a printing code: its card's name and type, or null. */
function lookUp(code: string, index: CatalogIndex): { name: string; type: string } | null {
  const printing = index.printingByCode.get(code);
  const card = printing ? index.cardById.get(printing.card_id) : undefined;
  return card ? { name: card.name, type: card.type } : null;
}

const ref = (code: string, count: number, index: CatalogIndex): CardRef => ({
  name: lookUp(code, index)?.name ?? code,
  code,
  count,
});

/**
 * A decoded deck code as a DeckList, sorted by catalog type: the legend, the
 * chosen champion (its copy taken out of the main deck, as in a text export),
 * battlefields, runes, main deck and sideboard. Codes the catalog doesn't
 * know go to `unsorted`, named by their code — except the chosen champion
 * and additional legends, whose slots the code itself names.
 */
export function deckListFromCode(deck: DecodedDeck, index: CatalogIndex): DeckList {
  const list = emptyDeckList();
  const unsorted: CardRef[] = [];
  let championTaken = false;

  for (const { code, count } of deck.cards) {
    let n = count;
    if (!championTaken && code === deck.chosenChampion) {
      list.champion = ref(code, 1, index);
      championTaken = true;
      n -= 1;
      if (n === 0) continue;
    }
    const known = lookUp(code, index);
    const card = ref(code, n, index);
    const section: Placed = known ? sectionFor(known.type) : 'unsorted';
    if (section === 'unsorted') unsorted.push(card);
    else if (section === 'legend') {
      if (list.legend) list.additionalLegends.push(card);
      else list.legend = card;
    } else list[section].push(card);
  }
  // A champion code with no copy among the cards still names the slot.
  if (!championTaken && deck.chosenChampion) list.champion = ref(deck.chosenChampion, 1, index);

  list.additionalLegends.push(...deck.additionalLegends.map((code) => ref(code, 1, index)));
  list.sideboard = deck.sideboard.map(({ code, count }) => ref(code, count, index));
  if (unsorted.length) list.unsorted = unsorted;
  return list;
}

/**
 * For display: unsorted cards the catalog now knows (say, once a new set is
 * imported) moved into the section their type says, with their catalog name.
 * The stored list is unchanged; editing and saving the deck makes it stick.
 */
export function resortUnsorted(list: DeckList, index: CatalogIndex): DeckList {
  if (!list.unsorted?.length) return list;
  const out: DeckList = {
    ...list,
    main: [...list.main],
    battlefields: [...list.battlefields],
    runes: [...list.runes],
    additionalLegends: [...list.additionalLegends],
  };
  const still: CardRef[] = [];
  for (const card of list.unsorted) {
    const known = card.code ? lookUp(card.code, index) : null;
    if (!known) {
      still.push(card);
      continue;
    }
    const placed = { ...card, name: known.name };
    const section = sectionFor(known.type);
    if (section === 'legend') {
      if (out.legend) out.additionalLegends.push(placed);
      else out.legend = placed;
    } else if (section !== 'unsorted') out[section].push(placed);
  }
  if (still.length) out.unsorted = still;
  else delete out.unsorted;
  return out;
}

/**
 * A DeckList as a deck code's contents. Each card's printing: its own code
 * when it has one, else its catalog base printing (text imports have no
 * codes). Cards with no printing deck codes can carry are listed in
 * `missing` (by name), and no deck is returned.
 */
export function deckCodeFromList(
  list: DeckList,
  index: CatalogIndex,
): { deck: DecodedDeck } | { missing: string[] } {
  const canCarry = deckCodeCanCarry;
  const missing: string[] = [];
  const codeOf = (card: CardRef): string | null => {
    let code = card.code;
    if (!code || !canCarry(code)) {
      const m = matchCard(card, index);
      const base = m.kind === 'matched' ? m.printing?.code : m.kind === 'conflict' ? m.printing.code : undefined;
      code = base ?? code;
    }
    if (!code || !canCarry(code)) {
      missing.push(card.name);
      return null;
    }
    return code;
  };
  const tally = (cards: CardRef[]): DeckCodeCard[] => {
    const out = new Map<string, number>();
    for (const card of cards) {
      const code = codeOf(card);
      if (code) out.set(code, (out.get(code) ?? 0) + card.count);
    }
    return [...out].map(([code, count]) => ({ code, count }));
  };

  const champion = list.champion ? codeOf(list.champion) : null;
  const cards = tally([
    ...(list.legend ? [list.legend] : []),
    ...(list.champion ? [list.champion] : []),
    ...list.main,
    ...list.battlefields,
    ...list.runes,
    ...(list.unsorted ?? []),
  ]);
  const sideboard = tally(list.sideboard);
  const additionalLegends = list.additionalLegends.map(codeOf).filter((c): c is string => c !== null);
  if (missing.length) return { missing: [...new Set(missing)] };
  return { deck: { cards, sideboard, chosenChampion: champion, additionalLegends } };
}
