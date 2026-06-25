import React, { createContext, ReactNode, useContext, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import type { Game, Match, Player, PlayerId } from '@riftlog/core';

/**
 * Defaults a match still falls back on. The pre-match setup sheet now supplies
 * format and player names (see MatchConfig); `playerNames` here is the
 * fallback used when a name field is left blank. `targetScore` /
 * `aspirantsClimbCount` stay hardcoded — the app never enforces a target, so
 * there's no UI to set them yet.
 */
const DEFAULTS = {
  targetScore: 8,
  aspirantsClimbCount: 0,
  playerNames: ['Player 1', 'Player 2'] as const,
};

/**
 * Player-supplied configuration for a new match, collected by the pre-match
 * setup sheet. Names may be blank — `startMatch` falls back to DEFAULTS.
 */
export type MatchConfig = {
  bestOf: 1 | 3;
  playerNames: [string, string];
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
  endMatch: () => void;
  endGame: (result: GameResult) => void;
  advanceGame: () => void;

  // Score actions (intent-named, player-oriented)
  incrementScore: (playerId: PlayerId) => void;
  decrementScore: (playerId: PlayerId) => void;
  setScore: (playerId: PlayerId, value: number) => void;
};

const MatchContext = createContext<MatchContextType | undefined>(undefined);

const nowIso = () => new Date().toISOString();

/** Game wins a player needs to take the match for the given format. */
const winsToTakeMatch = (bestOf: 1 | 3) => (bestOf === 1 ? 1 : 2);

const makeGame = (targetScore: number, aspirantsClimbCount: number): Game => ({
  id: randomUUID(),
  targetScore,
  aspirantsClimbCount,
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
    // Blank name fields fall back to the generic "Player 1" / "Player 2".
    const nameFor = (i: 0 | 1) =>
      config.playerNames[i].trim() || DEFAULTS.playerNames[i];

    const newMatch: Match = {
      id: randomUUID(),
      bestOf: config.bestOf,
      players: [makePlayer('p1', nameFor(0)), makePlayer('p2', nameFor(1))],
      games: [makeGame(DEFAULTS.targetScore, DEFAULTS.aspirantsClimbCount)],
      currentGameIndex: 0,
      winnerId: null,
      startedAt: nowIso(),
      endedAt: null,
      hostUserId: null,
      guestUserIds: [],
    };
    setMatch(newMatch);
  };

  const endMatch = () => {
    // For v1: just discard the match. Persistence comes later.
    setMatch(null);
  };

  /**
   * Freeze the current game with the player-declared result, then decide the
   * match. Works generically for Bo1 and Bo3:
   *   - Bo1 is always settled after its single game (winner or draw).
   *   - Bo3 is settled once a player reaches 2 game wins.
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
      const matchWinner =
        players.find((p) => p.gameWins >= winsNeeded)?.id ?? null;
      // A Bo1 is decided by its single game, even on a draw (winner stays null).
      const settled = prev.bestOf === 1 || matchWinner !== null;

      return {
        ...prev,
        players,
        games,
        winnerId: matchWinner,
        endedAt: settled ? nowIso() : null,
      };
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

      const nextGame = makeGame(
        DEFAULTS.targetScore,
        DEFAULTS.aspirantsClimbCount,
      );
      return {
        ...prev,
        // Live score lives on Player.gameScore — reset it for the new game.
        players: prev.players.map((p) => ({ ...p, gameScore: 0 })),
        games: [...prev.games, nextGame],
        currentGameIndex: prev.currentGameIndex + 1,
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
        endMatch,
        endGame,
        advanceGame,
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
