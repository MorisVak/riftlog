import React, { createContext, ReactNode, useContext, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import type { Game, Match, Player, PlayerId } from '@riftlog/core';

/**
 * Default configuration for a new match. Pre-match UI doesn't exist yet,
 * so START uses these defaults. When pre-match UI is built, callers will
 * pass their own config to startMatch().
 */
const DEFAULTS = {
  bestOf: 1 as 1 | 3,
  targetScore: 8,
  aspirantsClimbCount: 0,
  playerNames: ['Player 1', 'Player 2'] as const,
};

export type MatchContextType = {
  match: Match | null;

  // Derived/convenience
  gameStarted: boolean;
  currentGame: Game | null;

  // Match lifecycle
  startMatch: () => void;
  endMatch: () => void;

  // Score actions (intent-named, player-oriented)
  incrementScore: (playerId: PlayerId) => void;
  decrementScore: (playerId: PlayerId) => void;
  setScore: (playerId: PlayerId, value: number) => void;
};

const MatchContext = createContext<MatchContextType | undefined>(undefined);

const nowIso = () => new Date().toISOString();

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

  const startMatch = () => {
    const newMatch: Match = {
      id: randomUUID(),
      bestOf: DEFAULTS.bestOf,
      players: [
        makePlayer('p1', DEFAULTS.playerNames[0]),
        makePlayer('p2', DEFAULTS.playerNames[1]),
      ],
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

  return (
    <MatchContext.Provider
      value={{
        match,
        gameStarted,
        currentGame,
        startMatch,
        endMatch,
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
