import type { DeckSnapshot } from './deck';

/**
 * The local identity of a player *within a single match*.
 * Independent of any Supabase user account.
 */
export type PlayerId = 'p1' | 'p2';

export type Player = {
  id: PlayerId;
  name: string;
  gameScore: number;
  gameWins: number;
  xp: number;
  deck?: DeckSnapshot;
  /**
   * Forward-compatible: Supabase user ID once auth lands.
   * null for players who don't have a Riftlog account.
   */
  userId: string | null;
};

export type Game = {
  id: string;
  scoresAtEnd: Record<PlayerId, number>;
  winnerId: PlayerId | null;
  startedAt: string; // ISO-8601
  endedAt: string | null;
};

export type Match = {
  id: string;
  bestOf: 1 | 3;
  players: Player[]; // length 2 for v1
  games: Game[]; // includes the in-progress game
  currentGameIndex: number;
  winnerId: PlayerId | null;
  startedAt: string;
  endedAt: string | null;

  /**
   * Timed mode. `null` = untimed (the default).
   *
   * One countdown for the WHOLE match — the Bo1's game, or the entire Bo3
   * series — anchored on the first game's `startedAt`. It never pauses:
   * sideboarding between games in a Bo3 runs on the same clock, and it keeps
   * counting past zero into overtime.
   *
   * Only the configured limit is stored. Remaining time is always *derived*
   * from wall-clock (`limit - (now - firstGame.startedAt) - paused time`), so
   * there is no tick state to keep in sync — backgrounding the app, reloading
   * JS, or restoring an interrupted match from the outbox all recompute the
   * same value. Elapsed time for a finished match comes from
   * `startedAt`/`endedAt`.
   */
  timeLimitSeconds: number | null;

  /**
   * When the clock was paused (ISO-8601), or null while it's running. The
   * players can stop the clock on the board for an interruption — a judge
   * call, a spill — and resume it after.
   */
  clockPausedAt: string | null;

  /**
   * Total milliseconds the clock has spent paused across the match, banked on
   * each resume. Subtracting this (plus any in-progress pause) from wall-clock
   * elapsed is what keeps the countdown derivable rather than ticked.
   */
  clockPausedMs: number;

  /**
   * Forward-compatible for v2 QR co-recording feature.
   * For now: null/empty until auth lands and QR scanning is built.
   */
  hostUserId: string | null;
  guestUserIds: string[];

  notes?: string;
  tags?: string[];
};
