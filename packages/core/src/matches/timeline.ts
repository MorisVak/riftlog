import type { PlayerId, PointEvent, ScoringAction } from '../types/match';

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
 * The points that actually stood. A take-back (`delta: -1`) cancels that
 * player's most recent remaining point, and neither shows up — the board's
 * "tap the numeral" is a correction, not part of how the game went. A stray
 * take-back with nothing to cancel is ignored.
 */
export function netPoints(events: readonly PointEvent[]): PointEvent[] {
  const kept: (PointEvent | null)[] = [];
  const open: Record<PlayerId, number[]> = { p1: [], p2: [] };
  for (const e of events) {
    if (e.delta === 1) {
      open[e.playerId].push(kept.length);
      kept.push(e);
    } else {
      const i = open[e.playerId].pop();
      if (i !== undefined) kept[i] = null;
    }
  }
  return kept.filter((e): e is PointEvent => e !== null);
}

/** One step of a player's score line: their score from `atMs` on. */
export type ScoreStep = { atMs: number; score: number };

/**
 * Each player's score as a step series over game time, from the net points.
 * Every series starts at `{ atMs: 0, score: 0 }`; each kept point adds a step.
 * This is what the match detail's score graph draws.
 */
export function scoreSeries(
  events: readonly PointEvent[],
): Record<PlayerId, ScoreStep[]> {
  const series: Record<PlayerId, ScoreStep[]> = {
    p1: [{ atMs: 0, score: 0 }],
    p2: [{ atMs: 0, score: 0 }],
  };
  for (const e of netPoints(events)) {
    const line = series[e.playerId];
    const last = line[line.length - 1]?.score ?? 0;
    line.push({ atMs: e.atMs, score: last + 1 });
  }
  return series;
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
