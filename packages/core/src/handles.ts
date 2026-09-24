/**
 * @handle rules and suggestion helpers. Pure — no I/O.
 *
 * The database is the authority (CHECK constraint, reserved_names, unique
 * index, the claim RPCs). These mirror only the FORMAT rule so a client can
 * reject obviously invalid input without a round trip; reserved words and
 * availability are always asked of the server.
 */

/** Mirrors the `profiles_username_format` CHECK. Keep the two in lockstep. */
export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const HANDLE_RULE_TEXT =
  '3–20 characters: lowercase letters, numbers, and underscores.';

/** Mirrors the `profiles_display_name_format` CHECK (after trimming). */
export const DISPLAY_NAME_MAX = 32;

export const isValidHandleFormat = (handle: string): boolean =>
  HANDLE_PATTERN.test(handle);

/**
 * Turn a free-form name into a handle candidate, or null if too little
 * survives. "Jöhn Doe!" → "john_doe"; "李" → null.
 */
export function slugifyHandle(name: string): string | null {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents left by NFKD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, HANDLE_MAX)
    .replace(/_+$/g, ''); // the cut can land right after a separator

  return slug.length >= HANDLE_MIN ? slug : null;
}

/**
 * Alternatives for a taken handle. Returns more than the UI shows on purpose:
 * the caller checks them all and displays the first few that are free.
 * `rand` is injectable so the output is deterministic under test.
 */
export function handleVariants(
  base: string,
  count = 5,
  rand: () => number = Math.random,
): string[] {
  const out = new Set<string>();
  // Leave room for a separator plus up to 3 digits within the 20-char cap.
  const stem = base.slice(0, HANDLE_MAX - 4).replace(/_+$/g, '');
  if (stem.length < 1) return [];

  let guard = 0;
  while (out.size < count && guard++ < count * 10) {
    const digits = String(Math.floor(rand() * 999) + 1);
    const candidate =
      out.size % 2 === 0 ? `${stem}_${digits}` : `${stem}${digits}`;
    if (candidate !== base && isValidHandleFormat(candidate)) {
      out.add(candidate);
    }
  }
  return [...out];
}

type Metadata = Record<string, unknown> | null | undefined;

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

/**
 * The provider name to base a handle suggestion on, most handle-like first,
 * or null when there's nothing usable (email OTP; Apple without a shared name).
 *
 * Supabase's observed Discord shape: `full_name` = the Discord USERNAME
 * (already handle-shaped), `name` = "username#0", `custom_claims.global_name`
 * = the display name. Google sends `full_name`/`name` (a real name). Apple has
 * only the `full_name` we back up on first sign-in, if the user shared it.
 * Never the email — its local part is often a real name the user didn't
 * choose to publish.
 */
export function handleSuggestionSource(meta: Metadata): string | null {
  if (!meta) return null;
  const claims =
    meta.custom_claims && typeof meta.custom_claims === 'object'
      ? (meta.custom_claims as Record<string, unknown>)
      : {};
  const discordName = str(meta.name)?.replace(/#\d+$/, '') ?? null;

  const candidates = [
    str(meta.full_name),
    str(meta.user_name),
    str(meta.preferred_username),
    str(claims.global_name),
    str(meta.global_name),
    discordName,
  ];

  for (const c of candidates) {
    if (c !== null && slugifyHandle(c) !== null) return c;
  }
  return null;
}
