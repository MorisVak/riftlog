/**
 * A Riftlog account's profile. One row per authenticated user, seeded
 * automatically by a Postgres trigger on first sign-in (see
 * `supabase/migrations/*_profiles.sql`) — there is no username-claim step at
 * signup and no client-side creation path.
 */
export type Profile = {
  /** = the Supabase `auth.users` id. */
  id: string;

  /**
   * The unique @handle in Riftlog's namespace. Lowercase `[a-z0-9_]`,
   * case-insensitively unique, auto-assigned from the display name at signup
   * (`maurice` → `maurice1` → `player_a4f2c1`). Users rename it later; it is
   * NOT the provider's username.
   */
  username: string;

  /**
   * Cosmetic name, taken from whatever the identity provider gave us. Not
   * unique, and deliberately separate from `username`: two people called
   * "Maurice" are fine, two `@maurice`s are not.
   */
  displayName: string;

  /** Provider avatar if one was supplied, else null. */
  avatarUrl: string | null;

  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
};
