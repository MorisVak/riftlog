import type { DeckSnapshot } from './deck';

/**
 * The local identity of a player *within a single match*.
 * Independent of any Supabase user account.
 */
export type PlayerId = 'p1' | 'p2';

export type Player = {
  id: PlayerId;
  name: string;
  gameScore: number;
  gameWins: number;
  xp: number;
  deck?: DeckSnapshot;
  /**
   * Forward-compatible: Supabase user ID once auth lands.
   * null for players who don't have a Riftlog account.
   */
  userId: string | null;
};

export type Game = {
  id: string;
  targetScore: number;
  aspirantsClimbCount: number;
  scoresAtEnd: Record<PlayerId, number>;
  winnerId: PlayerId | null;
  startedAt: string; // ISO-8601
  endedAt: string | null;
};

export type Match = {
  id: string;
  bestOf: 1 | 3;
  players: Player[]; // length 2 for v1
  games: Game[]; // includes the in-progress game
  currentGameIndex: number;
  winnerId: PlayerId | null;
  startedAt: string;
  endedAt: string | null;

  /**
   * Forward-compatible for v2 QR co-recording feature.
   * For now: null/empty until auth lands and QR scanning is built.
   */
  hostUserId: string | null;
  guestUserIds: string[];

  notes?: string;
  tags?: string[];
};
