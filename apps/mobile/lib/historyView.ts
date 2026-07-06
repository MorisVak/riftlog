import type { Player, PlayerId } from '@riftlog/core';
import type { GameRow, MatchWithGames } from './matchPersistence';

/**
 * View-model mapping for the History tab. The device owner is always player
 * `p1` ("you"), so win/loss/draw and score color are derived from p1's
 * outcome. Kept pure and separate from the row component so the component stays
 * dumb and this logic is easy to eyeball.
 */

export type Result = 'win' | 'loss' | 'draw';

export type HistoryGameVM = {
  /** 1-based game number. */
  n: number;
  /** Final score, e.g. "8–5". */
  label: string;
  /** Result letter from p1's perspective. */
  letter: 'W' | 'L' | 'D';
  result: Result;
};

export type HistoryRowVM = {
  id: string;
  result: Result;
  letter: 'W' | 'L' | 'D';
  opponent: string;
  format: 'BO1' | 'BO3';
  score: string;
  date: string;
  games: HistoryGameVM[];
};

const LETTER: Record<Result, 'W' | 'L' | 'D'> = { win: 'W', loss: 'L', draw: 'D' };

const EN_DASH = '–';

/** Win/loss/draw from p1's ("your") perspective. */
function resultFor(winnerId: string | null): Result {
  if (winnerId === 'p1') return 'win';
  if (winnerId === 'p2') return 'loss';
  return 'draw';
}

/** Points line "p1–p2" from a game's `scores_at_end` JSON. */
function scoreLine(scores: GameRow['scores_at_end']): string {
  const s = (scores ?? {}) as Partial<Record<PlayerId, number>>;
  return `${s.p1 ?? 0}${EN_DASH}${s.p2 ?? 0}`;
}

export function toHistoryRowVM(m: MatchWithGames): HistoryRowVM {
  const players = (m.players as unknown as Player[]) ?? [];
  const p1 = players.find((p) => p.id === 'p1');
  const p2 = players.find((p) => p.id === 'p2');

  const result = resultFor(m.winner_id);
  const isBo1 = m.best_of === 1;

  const score = isBo1
    ? scoreLine(m.games[0]?.scores_at_end ?? null)
    : `${p1?.gameWins ?? 0}${EN_DASH}${p2?.gameWins ?? 0}`;

  const games: HistoryGameVM[] = m.games.map((g) => {
    const r = resultFor(g.winner_id);
    return {
      n: g.game_index + 1,
      label: scoreLine(g.scores_at_end),
      letter: LETTER[r],
      result: r,
    };
  });

  return {
    id: m.id,
    result,
    letter: LETTER[result],
    opponent: p2?.name ?? 'Player 2',
    format: isBo1 ? 'BO1' : 'BO3',
    score,
    date: new Date(m.ended_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    games,
  };
}
