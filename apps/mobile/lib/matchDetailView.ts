import {
  hasScoringActions,
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
  /**
   * The points say how they were scored (conquer / hold / special), so your
   * line is colored by action. False for a game scored on the simple board:
   * the graph then shows the score race only.
   */
  detailed: boolean;
};

export type DetailGameVM = {
  /** The game row's id — what a note edit updates. */
  id: string;
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
  /** Your note on this game, if any. */
  notes: string | null;
};

export type MatchDetailVM = HistoryRowVM & {
  title: 'Victory' | 'Defeat' | 'Draw';
  formatLong: 'Best of 1' | 'Best of 3';
  dateLong: string;
  detailGames: DetailGameVM[];
  /** Your note on the whole match (the round), if any. */
  notes: string | null;
  /** At least one game has no recorded score graph (older matches). */
  missingTimelines: boolean;
};

export const TITLE: Record<Result, MatchDetailVM['title']> = {
  win: 'Victory',
  loss: 'Defeat',
  draw: 'Draw',
};

export const resultFor = (winner: string | null): Result =>
  winner === 'p1' ? 'win' : winner === 'p2' ? 'loss' : 'draw';

/** One game's facts, from a saved row or the match still in memory. */
export type GameInput = {
  id: string;
  /** 1-based. */
  n: number;
  scores: { p1: number; p2: number };
  winnerId: string | null;
  startedAt: string;
  endedAt: string | null;
  /** Raw recorded points (jsonb or `Game.events`); validated here. */
  events: unknown;
  notes: string | null;
};

/**
 * A game's line on the Games card (and its score graph). Shared by the match
 * detail (saved rows) and the match-complete screen (the match in memory),
 * so the two can't disagree.
 */
export function toDetailGameVM(g: GameInput, opponent: string): DetailGameVM {
  const unfinished = g.endedAt == null;
  const result = unfinished ? 'unfinished' : resultFor(g.winnerId);
  const letter =
    result === 'unfinished' ? null : result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D';

  const events = toPointEvents(g.events);
  let graph: GameGraphVM | null = null;
  if (events.length > 0) {
    const series = scoreSeries(events);
    const lastAt = Math.max(...events.map((e) => e.atMs));
    const ran = g.endedAt != null ? Date.parse(g.endedAt) - Date.parse(g.startedAt) : lastAt;
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
      summary: `Score over ${durationLabel}: you reached ${youFinal}, ${opponent} ${themFinal}.`,
      detailed: hasScoringActions(events),
    };
  }

  return {
    id: g.id,
    n: g.n,
    you: g.scores.p1,
    them: g.scores.p2,
    share: pointShare(g.scores),
    result,
    letter,
    graph,
    notes: g.notes,
  };
}

export function toMatchDetailVM(m: MatchWithGames): MatchDetailVM {
  const row = toHistoryRowVM(m);

  const detailGames = m.games.map((g) => {
    const s = (g.scores_at_end ?? {}) as Partial<Record<PlayerId, number>>;
    return toDetailGameVM(
      {
        id: g.id,
        n: g.game_index + 1,
        scores: { p1: s.p1 ?? 0, p2: s.p2 ?? 0 },
        winnerId: g.winner_id,
        startedAt: g.started_at,
        endedAt: g.ended_at,
        events: g.events,
        notes: g.notes ?? null,
      },
      row.opponent,
    );
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
    notes: m.notes ?? null,
    missingTimelines: detailGames.some((g) => g.graph === null),
  };
}
