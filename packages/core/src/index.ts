/**
 * @riftlog/core
 *
 * Shared domain model, schemas, and pure utilities used by all Riftlog apps.
 * No platform-specific code, no UI, no I/O.
 */

export const RIFTLOG_CORE_VERSION = '0.0.0';

export type { DeckSnapshot } from './types/deck';
export type { PlayerId, Player, Game, Match } from './types/match';
