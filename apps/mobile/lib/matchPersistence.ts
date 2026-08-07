import type { Database, Match } from '@riftlog/core';
import { supabase } from './supabase';

type MatchInsert = Database['public']['Tables']['matches']['Insert'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];
export type GameRow = Database['public']['Tables']['games']['Row'];

/** A match row with its games embedded (newest match first; games by index). */
export type MatchWithGames = MatchRow & { games: GameRow[] };

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
    // Timed mode: only the configured limit is persisted — how long the match
    // actually ran (and so whether it went to overtime) is derived from
    // started_at / ended_at. null for an untimed match.
    // `?? null` covers a match queued in the outbox before timed mode existed.
    time_limit_seconds: match.timeLimitSeconds ?? null,
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
 * Read the signed-in user's match history from Postgres, newest first, with
 * each match's games embedded (ordered by game_index) for the inline per-game
 * breakdown. RLS scopes both tables to the caller's own rows, so no explicit
 * user filter is needed. Read on demand — history is never mirrored locally.
 */
export async function fetchMatchHistory(): Promise<MatchWithGames[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, games(*)')
    .order('ended_at', { ascending: false })
    .order('game_index', { referencedTable: 'games', ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Permanently delete a match and all of its games. The `games.match_id` FK is
 * `on delete cascade`, so removing the match row removes its games in the same
 * statement — no orphaned game rows are ever left behind. RLS scopes the delete
 * to the caller's own match (`user_id = auth.uid()`), so a user can only delete
 * their own. Errors propagate to the caller.
 */
export async function deleteMatch(matchId: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw error;
}
