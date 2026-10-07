import {
  buildTimeline,
  pointShare,
  toPointEvents,
  type PlayerId,
  type ScoringAction,
} from '@riftlog/core';
import type { MatchWithGames } from './matchPersistence';
import { toHistoryRowVM, type HistoryRowVM, type Result } from './historyView';
import { formatClock } from './clock';

/**
 * View-model for the match detail screen. Builds on the History row VM (same
 * result / opponent / format / timer / deck rules, from p1's perspective — p1
 * is always you) and adds the per-game breakdown and point timelines.
 *
 * v1 is about YOUR side only. With match mode, this grows an opponent block:
 * their deck (a version they own), their linked profile, head-to-head and
 * their win rate — none of which exists to show yet.
 */

const EN_DASH = '–';

export type TimelineRowVM = {
  key: string;
  /** Game time when it happened, e.g. "03:12". */
  time: string;
  /** "You" or the opponent's name. */
  who: string;
  /** True for your points (left-aligned color, bold). */
  mine: boolean;
  /** How it was scored, or a correction (a point taken back). */
  kind: ScoringAction | 'correction';
  /** "Conquer", "Hold", "Special", or "Point removed". */
  label: string;
  /** Running score after this event, you–them. */
  score: string;
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
  /** Empty for games recorded before point timelines existed. */
  timeline: TimelineRowVM[];
};

export type MatchDetailVM = HistoryRowVM & {
  title: 'Victory' | 'Defeat' | 'Draw';
  formatLong: 'Best of 1' | 'Best of 3';
  dateLong: string;
  detailGames: DetailGameVM[];
  /** At least one game has no recorded timeline (older matches). */
  missingTimelines: boolean;
};

const TITLE: Record<Result, MatchDetailVM['title']> = {
  win: 'Victory',
  loss: 'Defeat',
  draw: 'Draw',
};

const LABEL: Record<TimelineRowVM['kind'], string> = {
  conquer: 'Conquer',
  hold: 'Hold',
  special: 'Special',
  correction: 'Point removed',
};

const resultFor = (winner: string | null): Result =>
  winner === 'p1' ? 'win' : winner === 'p2' ? 'loss' : 'draw';

export function toMatchDetailVM(m: MatchWithGames): MatchDetailVM {
  const row = toHistoryRowVM(m);
  const name = (id: PlayerId) => (id === 'p1' ? 'You' : row.opponent);

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

    const timeline = buildTimeline(toPointEvents(g.events)).map(
      (e, i): TimelineRowVM => ({
        key: `${g.id}-${i}`,
        time: formatClock(e.atMs / 1000),
        who: name(e.playerId),
        mine: e.playerId === 'p1',
        kind: e.action ?? 'correction',
        label: LABEL[e.action ?? 'correction'],
        score: `${e.score.p1}${EN_DASH}${e.score.p2}`,
      }),
    );

    return {
      n: g.game_index + 1,
      you: scores.p1,
      them: scores.p2,
      share: pointShare(scores),
      result,
      letter,
      timeline,
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
    missingTimelines: detailGames.some((g) => g.timeline.length === 0),
  };
}
