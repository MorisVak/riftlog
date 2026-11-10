import { AUTH_REDIRECT_URI } from '@/lib/auth';

/**
 * Expo Router runs every incoming deep link through this before navigating.
 *
 * The OAuth redirect (`riftlog://auth-callback#access_token=…`) is not a
 * screen. `signInWithRedirectProvider` (lib/auth.ts) reads it off the
 * `openAuthSessionAsync` result. On iOS the auth session swallows the URL, so
 * the router never sees it; on Android the browser hands it to the app as a
 * normal deep link, so the router sees it too, finds no `/auth-callback`
 * route and swaps the whole root layout (providers included) for "Unmatched
 * Route" — the sign-in succeeds behind a dead screen.
 *
 * So the router drops it: an empty string means "don't navigate". As the
 * launch URL (Android killed the app while the browser was open, so no sign-in
 * is waiting for the tokens) it opens Home; the user signs in again.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  if (path.startsWith(AUTH_REDIRECT_URI)) return initial ? '/' : '';
  return path;
}
