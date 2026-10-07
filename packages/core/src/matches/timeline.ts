import type { PlayerId, PointEvent, ScoringAction } from '../types/match';

/** A point event with the score as it stood right after it. */
export type TimelineEntry = PointEvent & {
  score: Record<PlayerId, number>;
};

const ACTIONS: readonly ScoringAction[] = ['conquer', 'hold', 'special'];

/** Runtime check for one stored point event (a `games.events` element). */
export function isPointEvent(value: unknown): value is PointEvent {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.atMs === 'number' &&
    e.atMs >= 0 &&
    (e.playerId === 'p1' || e.playerId === 'p2') &&
    (e.delta === 1 || e.delta === -1) &&
    (e.action === null ||
      (typeof e.action === 'string' &&
        (ACTIONS as readonly string[]).includes(e.action)))
  );
}

/**
 * Narrow a stored events array, dropping anything malformed rather than
 * failing the whole match view. Non-arrays read as "no events".
 */
export function toPointEvents(value: unknown): PointEvent[] {
  return Array.isArray(value) ? value.filter(isPointEvent) : [];
}

/**
 * Replay a game's events into a timeline with the running score after each
 * one. Scores never go below 0, matching the board (a take-back at 0 is never
 * recorded, but a stray one in old data is clamped rather than trusted).
 */
export function buildTimeline(events: readonly PointEvent[]): TimelineEntry[] {
  const score: Record<PlayerId, number> = { p1: 0, p2: 0 };
  return events.map((e) => {
    score[e.playerId] = Math.max(0, score[e.playerId] + e.delta);
    return { ...e, score: { ...score } };
  });
}

/**
 * Your share of a game's points — the fill of the score bar on the match
 * detail ("8–5" → 8/13). 0 for a 0–0 game.
 */
export function pointShare(
  scores: Record<PlayerId, number>,
  you: PlayerId = 'p1',
): number {
  const total = scores.p1 + scores.p2;
  return total === 0 ? 0 : scores[you] / total;
}
