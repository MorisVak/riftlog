import type { CardRef, DeckList } from '../types/deck';
import {
  DECK_TARGETS,
  emptyDeckList,
  sectionTotals,
  type DeckSection,
} from './sections';

/**
 * Plain-text decklist parser — the format Piltover Archive's "Export → Text"
 * produces:
 *
 *   Legend:
 *   1 Kennen, Heart of the Tempest
 *
 *   MainDeck:
 *   3 Traveling Merchant
 *   ...
 *
 * Pure: takes the pasted string, returns a list plus diagnostics. It never
 * throws and never rejects a whole paste — every problem is a diagnostic on
 * the line it came from, so the UI can show it in place.
 */

export type DeckDiagnosticCode =
  // errors — the line was dropped
  | 'unparseable_line'
  | 'invalid_count'
  | 'unknown_section'
  | 'line_outside_section'
  // warnings — the list was kept as written
  | 'missing_legend'
  | 'missing_champion'
  | 'legend_count'
  | 'champion_count'
  | 'extra_legend'
  | 'extra_champion'
  | 'main_count'
  | 'runes_count'
  | 'battlefields_count';

export type DeckDiagnostic = {
  /** 1-based line in the input, or null for a check on the whole deck. */
  line: number | null;
  /** The section the line (or check) belongs to, when known. */
  section: DeckSection | null;
  severity: 'error' | 'warning';
  code: DeckDiagnosticCode;
  message: string;
};

export type ParsedDeck = {
  list: DeckList;
  diagnostics: DeckDiagnostic[];
};

/**
 * Header spellings, compared after lowercasing, dropping a trailing colon, and
 * collapsing inner whitespace.
 */
const HEADERS: Record<string, DeckSection> = {
  legend: 'legend',
  legends: 'legend',
  champion: 'champion',
  champions: 'champion',
  'chosen champion': 'champion',
  maindeck: 'main',
  'main deck': 'main',
  main: 'main',
  battlefield: 'battlefields',
  battlefields: 'battlefields',
  rune: 'runes',
  runes: 'runes',
  sideboard: 'sideboard',
  'side deck': 'sideboard',
  side: 'sideboard',
};

/** `3` or `3x` (any case). */
const COUNT_TOKEN = /^(\d+)x?$/i;

const normalizeHeader = (line: string): string =>
  line.replace(/:\s*$/, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Duplicate detection ignores case and runs of whitespace. */
const cardKey = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, ' ');

type Entry = { card: CardRef; line: number };

export function parseDeckText(input: string): ParsedDeck {
  const diagnostics: DeckDiagnostic[] = [];
  // Per section, in first-seen order, with duplicates merged into the first.
  const entries: Record<DeckSection, Entry[]> = {
    legend: [],
    champion: [],
    main: [],
    battlefields: [],
    runes: [],
    sideboard: [],
  };
  const seen: Record<DeckSection, Map<string, Entry>> = {
    legend: new Map(),
    champion: new Map(),
    main: new Map(),
    battlefields: new Map(),
    runes: new Map(),
    sideboard: new Map(),
  };

  // `null` = before any header; `'skip'` = inside an unknown section.
  let section: DeckSection | 'skip' | null = null;

  const lines = input.split(/\r\n|\r|\n/);
  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    if (line === '') return;

    const header = HEADERS[normalizeHeader(line)];
    if (header) {
      section = header;
      return;
    }

    // Split at the FIRST whitespace only: card names contain commas and
    // spaces ("Kennen, Heart of the Tempest").
    const split = line.match(/^(\S+)\s+(.+)$/);
    const countMatch = split?.[1]?.match(COUNT_TOKEN);

    if (!split || !countMatch) {
      if (line.endsWith(':')) {
        section = 'skip';
        diagnostics.push({
          line: lineNo,
          section: null,
          severity: 'error',
          code: 'unknown_section',
          message: `Unknown section "${line.slice(0, -1).trim()}". Its cards were skipped.`,
        });
      } else {
        diagnostics.push({
          line: lineNo,
          section: section === 'skip' ? null : section,
          severity: 'error',
          code: 'unparseable_line',
          message: 'Expected a count and a card name, like "3 Gust".',
        });
      }
      return;
    }

    if (section === 'skip') return;

    const count = Number(countMatch[1]);
    const name = (split[2] ?? '').trim();

    if (count < 1) {
      diagnostics.push({
        line: lineNo,
        section,
        severity: 'error',
        code: 'invalid_count',
        message: 'A card needs a count of at least 1.',
      });
      return;
    }

    if (section === null) {
      diagnostics.push({
        line: lineNo,
        section: null,
        severity: 'error',
        code: 'line_outside_section',
        message:
          'This card comes before any section header (like "MainDeck:").',
      });
      return;
    }

    const key = cardKey(name);
    const existing = seen[section].get(key);
    if (existing) {
      existing.card.count += count;
      return;
    }
    const entry: Entry = { card: { name, code: null, count }, line: lineNo };
    seen[section].set(key, entry);
    entries[section].push(entry);
  });

  const list = emptyDeckList();
  list.main = entries.main.map((e) => e.card);
  list.battlefields = entries.battlefields.map((e) => e.card);
  list.runes = entries.runes.map((e) => e.card);
  list.sideboard = entries.sideboard.map((e) => e.card);

  // Legend: the first is the deck's legend. More than one isn't part of the
  // game yet — keep them rather than silently dropping what was pasted.
  const [legend, ...extraLegends] = entries.legend;
  if (legend) {
    list.legend = legend.card;
    if (legend.card.count > 1) {
      diagnostics.push({
        line: legend.line,
        section: 'legend',
        severity: 'warning',
        code: 'legend_count',
        message: 'A deck has one legend.',
      });
    }
  }
  for (const extra of extraLegends) {
    list.additionalLegends.push(extra.card);
    diagnostics.push({
      line: extra.line,
      section: 'legend',
      severity: 'warning',
      code: 'extra_legend',
      message: 'A deck has one legend. This one was kept as an additional legend.',
    });
  }

  // Champion: the first is the chosen champion. Any other champion line is a
  // regular main-deck card — it's put there so nothing pasted is lost.
  const [champion, ...extraChampions] = entries.champion;
  if (champion) {
    list.champion = champion.card;
    if (champion.card.count > 1) {
      diagnostics.push({
        line: champion.line,
        section: 'champion',
        severity: 'warning',
        code: 'champion_count',
        message: 'A deck has one chosen champion copy.',
      });
    }
  }
  for (const extra of extraChampions) {
    list.main.push(extra.card);
    diagnostics.push({
      line: extra.line,
      section: 'champion',
      severity: 'warning',
      code: 'extra_champion',
      message: 'Only one chosen champion. This one was added to the main deck.',
    });
  }

  // Deck-level checks: warnings only, never errors.
  if (!list.legend) {
    diagnostics.push({
      line: null,
      section: 'legend',
      severity: 'warning',
      code: 'missing_legend',
      message: 'No legend.',
    });
  }
  if (!list.champion) {
    diagnostics.push({
      line: null,
      section: 'champion',
      severity: 'warning',
      code: 'missing_champion',
      message: 'No chosen champion.',
    });
  }
  const totals = sectionTotals(list);
  if (totals.main !== DECK_TARGETS.main) {
    diagnostics.push({
      line: null,
      section: 'main',
      severity: 'warning',
      code: 'main_count',
      message: `Main deck has ${totals.main} cards (with the chosen champion); a deck has ${DECK_TARGETS.main}.`,
    });
  }
  if (totals.runes !== DECK_TARGETS.runes) {
    diagnostics.push({
      line: null,
      section: 'runes',
      severity: 'warning',
      code: 'runes_count',
      message: `${totals.runes} runes; a deck has ${DECK_TARGETS.runes}.`,
    });
  }
  if (totals.battlefields !== DECK_TARGETS.battlefields) {
    diagnostics.push({
      line: null,
      section: 'battlefields',
      severity: 'warning',
      code: 'battlefields_count',
      message: `${totals.battlefields} battlefields; a deck has ${DECK_TARGETS.battlefields}.`,
    });
  }

  return { list, diagnostics };
}
