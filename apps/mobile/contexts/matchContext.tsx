import React, { createContext, ReactNode, useContext, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import type { Game, Match, Player, PlayerId } from '@riftlog/core';

/**
 * Defaults a match still falls back on. The pre-match setup sheet now supplies
 * format and player names (see MatchConfig); `playerNames` here is the
 * fallback used when a name field is left blank. The slots are not
 * interchangeable — `p1` is always the device owner, `p2` the opponent.
 */
const DEFAULTS = {
  playerNames: ['You', 'Opponent'] as const,
};

/**
 * Player-supplied configuration for a new match, collected by the pre-match
 * setup sheet. Names may be blank — `startMatch` falls back to DEFAULTS.
 *
 * `timeLimitSeconds` is null for an untimed match (the default). When set, one
 * countdown covers the whole match and keeps running between games; see
 * `Match.timeLimitSeconds` and `lib/clock`.
 */
export type MatchConfig = {
  bestOf: 1 | 3;
  playerNames: [string, string];
  timeLimitSeconds: number | null;
};

/**
 * The result a player declares when ending a game. A real winner, or a draw
 * (recorded as `winnerId: null` on the frozen Game).
 */
export type GameResult = PlayerId | 'draw';

/**
 * Lifecycle phase of the current match. Derived from `match`, never stored —
 * see the derivation in the provider. Drives both the play-screen render and
 * the tab-bar visibility.
 */
export type MatchPhase = 'idle' | 'playing' | 'between-games' | 'over';

export type MatchContextType = {
  match: Match | null;

  // Derived/convenience
  gameStarted: boolean;
  currentGame: Game | null;
  phase: MatchPhase;

  // Match lifecycle
  startMatch: (config: MatchConfig) => void;
  resumeMatch: (match: Match) => void;
  endMatch: () => void;
  endGame: (result: GameResult) => void;
  advanceGame: () => void;
  concludeMatch: () => void;

  // Timed mode. No-ops on an untimed match or when already in that state.
  pauseClock: () => void;
  resumeClock: () => void;

  // Score actions (intent-named, player-oriented)
  incrementScore: (playerId: PlayerId) => void;
  decrementScore: (playerId: PlayerId) => void;
  setScore: (playerId: PlayerId, value: number) => void;
};

const MatchContext = createContext<MatchContextType | undefined>(undefined);

const nowIso = () => new Date().toISOString();

/** Game wins a player needs to take the match for the given format. */
const winsToTakeMatch = (bestOf: 1 | 3) => (bestOf === 1 ? 1 : 2);

/**
 * End a match from the current standings: more game wins takes it; level
 * standings are a draw, but only once a game has actually been decided. Stamps
 * endedAt. Pure — returns a new Match.
 *
 * At 0–0 with nothing played there's no result to record — that's an abandon,
 * not a draw — so the match is returned unchanged (no settle). The existing
 * `endGame` caller always passes a games array with the current game frozen,
 * so a game is decided there; the guard only matters for an early conclude.
 */
const settleMatch = (match: Match): Match => {
  const w1 = match.players.find((p) => p.id === 'p1')?.gameWins ?? 0;
  const w2 = match.players.find((p) => p.id === 'p2')?.gameWins ?? 0;

  if (w1 === w2 && !match.games.some((g) => g.endedAt !== null)) return match;

  const winnerId: PlayerId | null = w1 > w2 ? 'p1' : w2 > w1 ? 'p2' : null;
  return { ...match, winnerId, endedAt: nowIso() };
};

const makeGame = (): Game => ({
  id: randomUUID(),
  scoresAtEnd: { p1: 0, p2: 0 },
  winnerId: null,
  startedAt: nowIso(),
  endedAt: null,
});

const makePlayer = (id: PlayerId, name: string): Player => ({
  id,
  name,
  gameScore: 0,
  gameWins: 0,
  xp: 0,
  userId: null,
});

const MatchProvider = ({ children }: { children: ReactNode }) => {
  const [match, setMatch] = useState<Match | null>(null);

  const startMatch = (config: MatchConfig) => {
    // Blank name fields fall back to the generic "You" / "Opponent".
    const nameFor = (i: 0 | 1) =>
      config.playerNames[i].trim() || DEFAULTS.playerNames[i];

    const newMatch: Match = {
      id: randomUUID(),
      bestOf: config.bestOf,
      players: [makePlayer('p1', nameFor(0)), makePlayer('p2', nameFor(1))],
      games: [makeGame()],
      currentGameIndex: 0,
      winnerId: null,
      startedAt: nowIso(),
      endedAt: null,
      // The clock is anchored on game 1's startedAt (stamped in the same tick
      // by makeGame above), so it begins the moment play begins.
      timeLimitSeconds: config.timeLimitSeconds,
      clockPausedAt: null,
      clockPausedMs: 0,
      hostUserId: null,
      guestUserIds: [],
    };
    setMatch(newMatch);
  };

  /**
   * Rehydrate an in-progress match from the local store on launch (offline
   * recovery). Only restores when nothing is currently active, so it never
   * clobbers a live match. Persistence side-effects live in MatchSync.
   */
  const resumeMatch = (restored: Match) => {
    setMatch((prev) => prev ?? restored);
  };

  const endMatch = () => {
    // Discard the active match. The completed-match write already happened on
    // the endedAt transition (MatchSync); this just clears the in-memory state.
    setMatch(null);
  };

  /**
   * Freeze the current game with the player-declared result, then decide the
   * match. Works generically for Bo1 and Bo3, settling when either the win
   * threshold is reached or the format's games are exhausted:
   *   - Bo1 is always settled after its single game (winner or draw).
   *   - Bo3 is settled once a player reaches 2 game wins, OR after the 3rd
   *     game is played — capped at `bestOf` so draws can't run on forever.
   * On settle, `settleMatch` resolves the winner (or a draw) from standings.
   * When the match isn't settled the game is left frozen and the match enters
   * the `between-games` phase; the next game is created by `advanceGame()`.
   */
  const endGame = (result: GameResult) => {
    setMatch((prev) => {
      if (!prev || prev.endedAt !== null) return prev;

      const winnerId: PlayerId | null = result === 'draw' ? null : result;

      const players = prev.players.map((p) =>
        winnerId !== null && p.id === winnerId
          ? { ...p, gameWins: p.gameWins + 1 }
          : p,
      );

      const scoresAtEnd: Record<PlayerId, number> = {
        p1: prev.players.find((p) => p.id === 'p1')?.gameScore ?? 0,
        p2: prev.players.find((p) => p.id === 'p2')?.gameScore ?? 0,
      };

      const games = prev.games.map((g, i) =>
        i === prev.currentGameIndex
          ? { ...g, scoresAtEnd, winnerId, endedAt: nowIso() }
          : g,
      );

      const winsNeeded = winsToTakeMatch(prev.bestOf);
      const reachedWins = players.some((p) => p.gameWins >= winsNeeded);
      // Hard cap: a Bo{n} can never exceed n games. The game just frozen is
      // currentGameIndex; if it was the last slot, the match ends now regardless
      // of standings (all-draws / 1-1-with-a-draw resolve to a draw via
      // settleMatch). Without this, draws never settle and advanceGame() runs
      // unbounded into game 4, 5, 6…
      const capReached = prev.currentGameIndex + 1 >= prev.bestOf;

      if (reachedWins || capReached) {
        return settleMatch({ ...prev, players, games });
      }
      return { ...prev, players, games };
    });
  };

  /**
   * Start the next game of a Bo3 after the between-games screen. Resets live
   * scores via a fresh Game and advances the index. No-op if the current game
   * isn't frozen or the match is already over.
   */
  const advanceGame = () => {
    setMatch((prev) => {
      if (!prev || prev.endedAt !== null) return prev;
      const current = prev.games[prev.currentGameIndex];
      if (!current || current.endedAt === null) return prev;

      const nextGame = makeGame();
      return {
        ...prev,
        // Live score lives on Player.gameScore — reset it for the new game.
        players: prev.players.map((p) => ({ ...p, gameScore: 0 })),
        games: [...prev.games, nextGame],
        currentGameIndex: prev.currentGameIndex + 1,
      };
    });
  };

  /**
   * End the series immediately from current standings — the manual escape hatch
   * a Bo3 ("round") needs when it must stop before it's naturally decided (e.g.
   * time runs out at 1–0 or 1–1). `settleMatch` makes the leader the winner, or
   * a draw if level with a game already decided; stamping `endedAt` flips the
   * derived phase to `'over'`, routing to the match overview. No-op if there's
   * no match, it's already over, or nothing has been played (0–0 abandon).
   */
  const concludeMatch = () => {
    setMatch((prev) => {
      if (!prev || prev.endedAt !== null) return prev;
      return settleMatch(prev);
    });
  };

  /**
   * Stop the clock for an interruption. Only the pause *start* is recorded —
   * the elapsed pause is banked on resume, so the countdown stays derived from
   * timestamps instead of being ticked down.
   */
  const pauseClock = () => {
    setMatch((prev) => {
      if (!prev || prev.timeLimitSeconds == null || prev.clockPausedAt) return prev;
      return { ...prev, clockPausedAt: nowIso() };
    });
  };

  /** Resume, banking however long this pause lasted. */
  const resumeClock = () => {
    setMatch((prev) => {
      if (!prev?.clockPausedAt) return prev;
      const paused = Date.now() - Date.parse(prev.clockPausedAt);
      return {
        ...prev,
        clockPausedAt: null,
        clockPausedMs: (prev.clockPausedMs ?? 0) + Math.max(0, paused),
      };
    });
  };

  const updatePlayer = (
    playerId: PlayerId,
    updater: (player: Player) => Player,
  ) => {
    setMatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) => (p.id === playerId ? updater(p) : p)),
      };
    });
  };

  const incrementScore = (playerId: PlayerId) => {
    updatePlayer(playerId, (p) => ({ ...p, gameScore: p.gameScore + 1 }));
  };

  const decrementScore = (playerId: PlayerId) => {
    updatePlayer(playerId, (p) => ({
      ...p,
      gameScore: Math.max(p.gameScore - 1, 0),
    }));
  };

  const setScore = (playerId: PlayerId, value: number) => {
    updatePlayer(playerId, (p) => ({ ...p, gameScore: Math.max(value, 0) }));
  };

  const gameStarted = match !== null && match.endedAt === null;
  const currentGame = match?.games[match.currentGameIndex] ?? null;

  const phase: MatchPhase =
    match === null
      ? 'idle'
      : match.endedAt !== null
        ? 'over'
        : currentGame?.endedAt != null
          ? 'between-games'
          : 'playing';

  return (
    <MatchContext.Provider
      value={{
        match,
        gameStarted,
        currentGame,
        phase,
        startMatch,
        resumeMatch,
        endMatch,
        endGame,
        advanceGame,
        concludeMatch,
        pauseClock,
        resumeClock,
        incrementScore,
        decrementScore,
        setScore,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => {
  const context = useContext(MatchContext);
  if (!context) throw new Error('useMatch must be used within MatchProvider');
  return context;
};

export default MatchProvider;
