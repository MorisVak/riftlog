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
    .select(
      'id, username, display_name, onboarded_at, username_changed_at, created_at, updated_at',
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    onboardedAt: data.onboarded_at,
    usernameChangedAt: data.username_changed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ---- Handles & onboarding --------------------------------------------------

/** What `is_username_available` answers. Mirrors the SQL function. */
export type HandleAvailability =
  | 'available'
  | 'invalid_format'
  | 'reserved'
  | 'taken';

/** What `complete_onboarding` answers. Mirrors the SQL function. */
export type OnboardingResult =
  | 'ok'
  | 'invalid_display_name'
  | 'invalid_format'
  | 'reserved'
  | 'taken'
  | 'rate_limited'
  | 'no_profile';

const AVAILABILITY: readonly HandleAvailability[] = [
  'available',
  'invalid_format',
  'reserved',
  'taken',
];
const ONBOARDING: readonly OnboardingResult[] = [
  'ok',
  'invalid_display_name',
  'invalid_format',
  'reserved',
  'taken',
  'rate_limited',
  'no_profile',
];

// The generated types say `string`; narrow at the boundary so an unexpected
// code from a future migration fails loudly here, not as a silent UI state.
function narrow<T extends string>(allowed: readonly T[], value: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Unexpected response code: ${value}`);
}

/**
 * Live availability for the handle field. Advisory only — the unique index,
 * enforced inside `complete_onboarding` / `claim_username`, is the guarantee.
 */
export async function checkHandle(handle: string): Promise<HandleAvailability> {
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: handle,
  });
  if (error) throw error;
  return narrow(AVAILABILITY, data);
}

/**
 * Claim the handle, set the display name, and stamp `onboarded_at` in one
 * server-side transaction. `ok` is idempotent — calling it again after
 * success changes nothing.
 */
export async function completeOnboarding(
  handle: string,
  displayName: string,
): Promise<OnboardingResult> {
  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_username: handle,
    p_display_name: displayName,
  });
  if (error) throw error;
  return narrow(ONBOARDING, data);
}
