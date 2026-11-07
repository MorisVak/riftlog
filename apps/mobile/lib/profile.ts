import {
  parseLegendArt,
  parseScoringMode,
  type LegendArt,
  type Profile,
  type ScoringMode,
} from '@riftlog/core';
import { supabase } from './supabase';
import { DEMO, demoDefaultDeckId } from './demo';

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
      'id, username, display_name, onboarded_at, username_changed_at, default_deck_id, legend_art, scoring_mode, created_at, updated_at',
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
    // Demo mode (lib/demo.ts): the demo's own default deck.
    defaultDeckId: DEMO ? await demoDefaultDeckId() : data.default_deck_id,
    legendArt: parseLegendArt(data.legend_art),
    scoringMode: parseScoringMode(data.scoring_mode),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Set (or clear, with null) the deck the match setup pre-selects. A plain
 * owner-scoped update — `default_deck_id` is client-writable, and its FK only
 * accepts one of the caller's own decks.
 */
export async function setDefaultDeck(deckId: string | null): Promise<void> {
  if (DEMO) return;
  // The local session is enough for the id; RLS checks it server-side.
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase
    .from('profiles')
    .update({ default_deck_id: deckId })
    .eq('id', uid);
  if (error) throw error;
}

/**
 * Save which art legends are drawn with (display only). A plain owner-scoped
 * update — `legend_art` is client-writable; the DB checks it's an object.
 */
export async function setLegendArt(value: LegendArt): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update({ legend_art: value }).eq('id', uid);
  if (error) throw error;
}

/**
 * Save how the board scores (conquer / hold / special, or a plain − / +).
 * A plain owner-scoped update — `scoring_mode` is client-writable; the DB
 * checks it's one of the two modes. Takes effect from the next match.
 */
export async function setScoringMode(mode: ScoringMode): Promise<void> {
  if (DEMO) return;
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update({ scoring_mode: mode }).eq('id', uid);
  if (error) throw error;
}

/**
 * Revoke the user's Sign in with Apple tokens before their account is
 * deleted: the `revoke-apple` Edge Function trades the one-time code (from
 * `appleAuthorizationCode`) for the token and revokes it with Apple.
 */
export async function revokeAppleSignIn(code: string): Promise<void> {
  const { error } = await supabase.functions.invoke('revoke-apple', { body: { code } });
  if (error) throw error;
}

/**
 * Delete the signed-in account for good: the `delete_my_account` RPC removes
 * the auth user, and every row of theirs goes with it (FK cascades). The
 * caller signs out locally afterwards.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}

// ---- Handles & onboarding --------------------------------------------------

/** What `is_username_available` answers. Mirrors the SQL function. */
export type HandleAvailability = 'available' | 'invalid_format' | 'reserved' | 'taken';

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
