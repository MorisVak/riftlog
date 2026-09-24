/**
 * A Riftlog account's profile. One row per authenticated user, seeded by a
 * Postgres trigger on first sign-in with a neutral handle (`player_<hex>`);
 * the user claims their real handle at onboarding (see
 * `supabase/migrations/*_profile_identity.sql`). There is no client-side
 * creation path.
 *
 * `id` is the only thing other records may reference for identity — never
 * copy the handle onto another record; it's renameable.
 *
 * There is deliberately no avatar field: every account renders the same
 * default avatar.
 */
export type Profile = {
  /** = the Supabase `auth.users` id. Immutable. */
  id: string;

  /**
   * The unique @handle in Riftlog's namespace. Lowercase `[a-z0-9_]{3,20}`.
   * Seeded as `player_<hex>`, claimed at onboarding, renameable once per 30
   * days — only through the `claim_username` RPC, never a plain update.
   */
  username: string;

  /**
   * Cosmetic name, 1–32 chars, trimmed. Not unique, and deliberately separate
   * from `username`: two people called "Maurice" are fine, two `@maurice`s are
   * not. The owner may update it directly.
   */
  displayName: string;

  /** Null until onboarding is completed. */
  onboardedAt: string | null; // ISO-8601

  /** Last post-onboarding rename; null if never renamed. */
  usernameChangedAt: string | null; // ISO-8601

  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
};
