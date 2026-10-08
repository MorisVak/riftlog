import {
  pointShare,
  scoreSeries,
  toPointEvents,
  type PlayerId,
  type ScoreStep,
} from '@riftlog/core';
import type { MatchWithGames } from './matchPersistence';
import { toHistoryRowVM, type HistoryRowVM, type Result } from './historyView';
import { formatClock } from './clock';

/**
 * View-model for the match detail screen. Builds on the History row VM (same
 * result / opponent / format / timer / deck rules, from p1's perspective — p1
 * is always you) and adds the per-game breakdown and score graphs.
 *
 * v1 is about YOUR side only. With match mode, this grows an opponent block:
 * their deck (a version they own), their linked profile, head-to-head and
 * their win rate — none of which exists to show yet.
 */

/**
 * A game's score race: both players' step lines over game time, built from
 * the points that stood (take-backs cancel the point they undo and neither
 * appears).
 */
export type GameGraphVM = {
  you: ScoreStep[];
  them: ScoreStep[];
  /** x-axis end: the game's length (or its last point if it never ended). */
  durationMs: number;
  /** y-axis top: the higher final score, at least 1. */
  maxScore: number;
  /** e.g. "4:12" — the axis label for the game's length. */
  durationLabel: string;
  /** Spoken summary for screen readers (the chart's text alternative). */
  summary: string;
};

export type DetailGameVM = {
  n: number;
  you: number;
  them: number;
  /** Your share of the game's points — the bar's fill (0..1). */
  share: number;
  /** `unfinished`: the match was ended before this game was. */
  result: Result | 'unfinished';
  letter: 'W' | 'L' | 'D' | null;
  /** null for games recorded before point recording existed. */
  graph: GameGraphVM | null;
};

export type MatchDetailVM = HistoryRowVM & {
  title: 'Victory' | 'Defeat' | 'Draw';
  formatLong: 'Best of 1' | 'Best of 3';
  dateLong: string;
  detailGames: DetailGameVM[];
  /** At least one game has no recorded score graph (older matches). */
  missingTimelines: boolean;
};

const TITLE: Record<Result, MatchDetailVM['title']> = {
  win: 'Victory',
  loss: 'Defeat',
  draw: 'Draw',
};

const resultFor = (winner: string | null): Result =>
  winner === 'p1' ? 'win' : winner === 'p2' ? 'loss' : 'draw';

export function toMatchDetailVM(m: MatchWithGames): MatchDetailVM {
  const row = toHistoryRowVM(m);

  const detailGames: DetailGameVM[] = m.games.map((g) => {
    const s = (g.scores_at_end ?? {}) as Partial<Record<PlayerId, number>>;
    const scores = { p1: s.p1 ?? 0, p2: s.p2 ?? 0 };
    const unfinished = g.ended_at == null;
    const result = unfinished ? 'unfinished' : resultFor(g.winner_id);
    const letter =
      result === 'unfinished'
        ? null
        : result === 'win'
          ? 'W'
          : result === 'loss'
            ? 'L'
            : 'D';

    const events = toPointEvents(g.events);
    let graph: GameGraphVM | null = null;
    if (events.length > 0) {
      const series = scoreSeries(events);
      const lastAt = Math.max(...events.map((e) => e.atMs));
      const ran =
        g.ended_at != null
          ? Date.parse(g.ended_at) - Date.parse(g.started_at)
          : lastAt;
      const durationMs = Math.max(lastAt, ran, 1);
      const youFinal = series.p1.at(-1)?.score ?? 0;
      const themFinal = series.p2.at(-1)?.score ?? 0;
      const durationLabel = formatClock(durationMs / 1000);
      graph = {
        you: series.p1,
        them: series.p2,
        durationMs,
        maxScore: Math.max(youFinal, themFinal, 1),
        durationLabel,
        summary: `Score over ${durationLabel}: you reached ${youFinal}, ${row.opponent} ${themFinal}.`,
      };
    }

    return {
      n: g.game_index + 1,
      you: scores.p1,
      them: scores.p2,
      share: pointShare(scores),
      result,
      letter,
      graph,
    };
  });

  return {
    ...row,
    title: TITLE[row.result],
    formatLong: row.format === 'BO1' ? 'Best of 1' : 'Best of 3',
    dateLong: new Date(m.ended_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    detailGames,
    missingTimelines: detailGames.some((g) => g.graph === null),
  };
}
