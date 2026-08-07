import type { Match } from '@riftlog/core';

/**
 * Timed-mode clock math. Pure and wall-clock-derived: nothing about the
 * countdown is stored or ticked into state, so the value survives app
 * backgrounding, a JS reload, and resuming an interrupted match — every caller
 * recomputes the same number from `Match.timeLimitSeconds` and the moment game
 * 1 started.
 *
 * The clock covers the whole match (a Bo1's game or the entire Bo3) and never
 * pauses — the between-games break in a Bo3 is played on the same clock.
 */

/**
 * When the clock started ticking: game 1's kickoff. Falls back to the match's
 * own `startedAt`, which is stamped in the same tick by `startMatch`.
 */
export function clockStartedAt(match: Match): number {
  const started = match.games[0]?.startedAt ?? match.startedAt;
  return Date.parse(started);
}

/**
 * Whole seconds left on a timed match. Negative means overtime — the clock runs
 * past zero rather than stopping, because a round that goes long is still being
 * played. `null` for an untimed match.
 */
export function remainingSeconds(match: Match, now: number = Date.now()): number | null {
  // Loose check on purpose: a match stored on disk (in-progress slot or outbox)
  // before timed mode existed parses back with the field `undefined`.
  if (match.timeLimitSeconds == null) return null;
  const elapsed = (now - clockStartedAt(match)) / 1000;
  return Math.round(match.timeLimitSeconds - elapsed);
}

/**
 * `mm:ss`, zero-padded so the width never jitters as digits change. Negative
 * input is overtime and reads as `+mm:ss` (time played *past* the limit).
 * Minutes are not rolled into hours: a 90-minute round reads `90:00`.
 */
export function formatClock(seconds: number): string {
  const total = Math.abs(Math.trunc(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  const sign = seconds < 0 ? '+' : '';
  return `${sign}${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Wall-clock length of a finished match, in whole seconds. */
export function elapsedSeconds(startedAt: string, endedAt: string): number {
  return Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
}
