/**
 * @riftlog/core
 *
 * Shared domain model, schemas, and pure utilities used by all Riftlog apps.
 * No platform-specific code, no UI, no I/O.
 */

export const RIFTLOG_CORE_VERSION = '0.0.0';

export type {
  CardRef,
  DeckList,
  DeckImportSource,
  DeckSnapshot,
} from './types/deck';

export {
  parseDeckText,
  type DeckDiagnostic,
  type DeckDiagnosticCode,
  type ParsedDeck,
} from './decks/parseText';
export { formatDeckText } from './decks/formatText';
export { looksLikeDeckCode } from './decks/deckCode';
export {
  DECK_TARGETS,
  emptyDeckList,
  sectionTotals,
  type DeckSection,
  type SectionTotals,
} from './decks/sections';
export {
  DOMAINS,
  deckDomains,
  domainFromRuneName,
  type Domain,
  type DomainCount,
} from './decks/domains';
export type { PlayerId, Player, Game, Match } from './types/match';
export type { Profile } from './types/profile';

export {
  HANDLE_PATTERN,
  HANDLE_MIN,
  HANDLE_MAX,
  HANDLE_RULE_TEXT,
  DISPLAY_NAME_MAX,
  isValidHandleFormat,
  slugifyHandle,
  handleVariants,
  handleSuggestionSource,
} from './handles';

// Generated Supabase schema types (pure types, no runtime/IO). Regenerate with
// `pnpm db:types`. See packages/core/src/db/database.types.ts.
export type { Database } from './db/database.types';
