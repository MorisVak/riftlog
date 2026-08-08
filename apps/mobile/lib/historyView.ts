import type { Player, PlayerId } from '@riftlog/core';
import type { GameRow, MatchWithGames } from './matchPersistence';
import { elapsedSeconds, formatClock } from './clock';

/**
 * View-model mapping for the History tab. The device owner is always player
 * `p1` ("you"), so win/loss/draw, score color, and score order (`you–them`) are
 * derived from p1's outcome. Rows label the other side explicitly ("vs Alex")
 * so a single name is never mistaken for your own. Kept pure and separate from
 * the row component so the component stays dumb and this logic is easy to
 * eyeball.
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
  /** The device owner's name (p1) — shown in the expanded detail only. */
  you: string;
  /** Who you played against (p2) — always rendered with a "vs" prefix. */
  opponent: string;
  format: 'BO1' | 'BO3';
  score: string;
  date: string;
  games: HistoryGameVM[];
  /** Clock summary for a timed match; null when the match was untimed. */
  timer: HistoryTimerVM | null;
};

export type HistoryTimerVM = {
  /** The configured round length, e.g. "50:00". */
  limit: string;
  /** How long the match actually ran, start to finish. */
  played: string;
  /** True when it ran past the limit — the match went into overtime. */
  overtime: boolean;
};

const LETTER: Record<Result, 'W' | 'L' | 'D'> = { win: 'W', loss: 'L', draw: 'D' };

const EN_DASH = '–';

/**
 * Matches started with blank name fields stored the generic slot placeholders
 * ("Player 1" / "Player 2") rather than a real name — the setup sheet's old
 * fallback. Treat those, and empty strings, as "no name given" so a row reads
 * "vs Opponent" instead of the meaningless "vs Player 2".
 */
const PLACEHOLDER = /^player\s*[12]$/i;

const nameOr = (name: string | undefined, fallback: string): string => {
  const trimmed = name?.trim();
  if (!trimmed || PLACEHOLDER.test(trimmed)) return fallback;
  return trimmed;
};

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

  // Timed matches carry their configured clock; how long they actually ran —
  // and so whether they went to overtime — is measured from the timestamps
  // rather than stored.
  // Loose check: a row read back before the time_limit_seconds column existed
  // (or any row where it's absent) must count as untimed, not as a timed match
  // with an undefined limit — that rendered a NaN clock on every row.
  const limitSeconds = m.time_limit_seconds;
  const playedSeconds = elapsedSeconds(m.started_at, m.ended_at);
  const timer: HistoryTimerVM | null =
    limitSeconds == null
      ? null
      : {
          limit: formatClock(limitSeconds),
          played: formatClock(playedSeconds),
          overtime: playedSeconds > limitSeconds,
        };

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
    you: nameOr(p1?.name, 'You'),
    opponent: nameOr(p2?.name, 'Opponent'),
    format: isBo1 ? 'BO1' : 'BO3',
    score,
    date: new Date(m.ended_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    games,
    timer,
  };
}
