import type { Profile } from '@riftlog/core';
import { supabase } from './supabase';

/**
 * Read the signed-in user's profile. RLS scopes `profiles` to the caller's own
 * row, so no id filter is needed — `maybeSingle()` gets the one row or null.
 *
 * Null is a real, expected outcome, not just an error case: the seeding trigger
 * deliberately swallows its own failures rather than aborting a signup (see the
 * profiles migration), so an account can exist for a moment with no profile row.
 * Callers should degrade, not crash.
 */
export async function fetchMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
