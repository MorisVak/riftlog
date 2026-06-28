import type { Database, Match } from '@riftlog/core';
import { supabase } from './supabase';

type MatchInsert = Database['public']['Tables']['matches']['Insert'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];

/**
 * Persist a SETTLED match (and its games) directly to Postgres. The device has
 * already resolved the Bo3 / draw outcome in matchContext — this only writes
 * what's settled, it never re-derives anything.
 *
 * IDs are client-generated UUIDs, so writes are upserts by primary key and are
 * safe to retry. `user_id` is omitted: the DB defaults it to auth.uid(), and
 * RLS pins it. The match row is written before its games (FK dependency).
 *
 * Online path only (Slice 2). Errors propagate to the caller; Slice 3 adds the
 * offline outbox + retry.
 */
export async function saveCompletedMatch(match: Match): Promise<void> {
  if (!match.endedAt) {
    throw new Error('saveCompletedMatch called with an unsettled match');
  }

  const matchRow: MatchInsert = {
    id: match.id,
    best_of: match.bestOf,
    winner_id: match.winnerId,
    // jsonb columns: the Player/score shapes are plain JSON at runtime.
    players: match.players as unknown as MatchInsert['players'],
    started_at: match.startedAt,
    ended_at: match.endedAt,
    host_user_id: match.hostUserId,
    guest_user_ids: match.guestUserIds,
  };

  const { error: matchError } = await supabase.from('matches').upsert(matchRow);
  if (matchError) throw matchError;

  const gameRows: GameInsert[] = match.games.map((game, index) => ({
    id: game.id,
    match_id: match.id,
    game_index: index,
    scores_at_end: game.scoresAtEnd as unknown as GameInsert['scores_at_end'],
    winner_id: game.winnerId,
    started_at: game.startedAt,
    ended_at: game.endedAt,
  }));

  const { error: gamesError } = await supabase.from('games').upsert(gameRows);
  if (gamesError) throw gamesError;
}

/**
 * Read the signed-in user's match history from Postgres, newest first. RLS
 * scopes the result to the caller's own rows, so no explicit user filter is
 * needed. Read on demand — history is never mirrored locally.
 */
export async function fetchMatchHistory(): Promise<MatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('ended_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
