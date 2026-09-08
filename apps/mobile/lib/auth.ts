import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';
import { setLastAuthMethod } from '@/lib/authPrefs';

/**
 * Provider wiring. Every function here is a PLAIN sign-in: sign-in and sign-up
 * are the same action, and there is no anonymous conversion and no
 * `linkIdentity` anywhere. A first-time user gets an account and a profile row
 * (seeded by the Postgres trigger); a returning user gets their session.
 *
 * Two shapes, for a reason:
 *   - **Discord and Google** go through the browser redirect below. Neither
 *     needs an SDK or a client id in the app — Supabase holds the credentials
 *     and we only ever name the provider.
 *   - **Apple** has no browser flow on iOS, so it stays on the native
 *     id-token path.
 *
 * The single `updateUser` call in this file is Apple's name backfill; see
 * `signInWithApple`. Nothing else here mutates the user.
 *
 * Supabase's automatic email linking is left ON, so the same address across
 * providers resolves to one account. Apple's "Hide My Email" relay address is
 * the known exception, which can't match — see SPEC.md.
 *
 * Cancellation is not an error: the caller gets `'cancelled'` back rather than
 * a thrown exception, so a dismissed sheet doesn't paint a red message.
 */

// Closes any lingering auth session left over from a redirect that came back
// while the app was backgrounded.
WebBrowser.maybeCompleteAuthSession();

export type SignInOutcome = 'signed-in' | 'cancelled';

/**
 * Where Supabase sends the browser back to after an OAuth round trip. Mirrors
 * `expo.scheme` in app.json, already registered in Info.plist as `riftlog`.
 *
 * **This must match a Redirect URL in the Supabase dashboard exactly**
 * (Authentication → URL Configuration). If it doesn't, Supabase does not error
 * — it silently falls back to Site URL, the browser lands on a page that isn't
 * there, and the app is left waiting for a callback that never comes.
 *
 * Deliberately NOT `makeRedirectUri()`. Called with no arguments it only
 * resolves to a bare `riftlog://` when expo-linking considers the app
 * "Expo hosted"; otherwise it bakes the Metro host into the URL
 * (`riftlog://192.168.0.34:8081`). That value moves with the dev machine's
 * network, so it can never be reliably allow-listed. A fixed path is the whole
 * point: one value, allow-listed once, stable in dev and production.
 *
 * Discord and Google share this value, so adding Google needed no new entry in
 * the Supabase allow-list.
 */
export const AUTH_REDIRECT_URI = 'riftlog://auth-callback';

// ---- Discord + Google: web redirect ---------------------------------------

/** Providers driven through the browser rather than a native SDK. */
export type RedirectProvider = 'discord' | 'google';

const PROVIDER_LABEL: Record<RedirectProvider, string> = {
  discord: 'Discord',
  google: 'Google',
};

/**
 * The browser flow: open Supabase's authorize URL in an auth session, then
 * trade the tokens on the returned deep link for a session.
 *
 * Neither provider justifies a native SDK here. Discord has none worth the
 * surface area, and Google's would drag in a client id, a reversed-client-id
 * URL scheme, and a config plugin to deliver the same session this does.
 *
 * The client runs the **implicit** flow (`lib/supabase.ts` leaves `flowType`
 * at the auth-js default), so the session arrives as tokens in the URL
 * fragment. That is why this reads `access_token`/`refresh_token` and calls
 * `setSession` rather than `exchangeCodeForSession`, which is the PKCE
 * counterpart and would find no `code` to exchange.
 */
export async function signInWithRedirectProvider(
  provider: RedirectProvider,
): Promise<SignInOutcome> {
  const label = PROVIDER_LABEL[provider];

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: AUTH_REDIRECT_URI,
      // We drive the browser ourselves; letting supabase-js redirect would
      // leave the app with no way to observe the result.
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error(`${label} sign-in did not return an auth URL.`);

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    AUTH_REDIRECT_URI,
  );

  if (result.type !== 'success') {
    // A misconfigured redirect is INDISTINGUISHABLE from a real cancel here:
    // the browser is sent somewhere that never deep-links back, the user
    // dismisses the sheet, and we land in this branch either way. So we keep
    // the UI silent (a real cancel must not paint an error) and say it out
    // loud in the logs instead.
    if (__DEV__) {
      console.warn(
        `[auth] ${label} sign-in ended as "${result.type}" without a callback. ` +
          `If this wasn't a cancel, check that "${AUTH_REDIRECT_URI}" is listed ` +
          `under Supabase → Authentication → URL Configuration → Redirect URLs. ` +
          `When it isn't, Supabase silently redirects to Site URL instead.`,
      );
    }
    return 'cancelled';
  }

  // Tokens come back in the URL fragment, which Linking.parse doesn't read —
  // getQueryParams handles both `?` and `#`.
  const { params, errorCode } = getQueryParams(result.url);
  if (errorCode) throw new Error(errorCode);

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error(
      `${label} sign-in came back to ${AUTH_REDIRECT_URI} with no session ` +
        `tokens. The redirect reached the app but carried no session — check ` +
        `the ${label} provider's client ID and secret in Supabase.`,
    );
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;

  await setLastAuthMethod(provider);
  return 'signed-in';
}

export const signInWithDiscord = (): Promise<SignInOutcome> =>
  signInWithRedirectProvider('discord');

export const signInWithGoogle = (): Promise<SignInOutcome> =>
  signInWithRedirectProvider('google');

// ---- Apple: native Sign in with Apple -------------------------------------

/** iOS-only; the login screen hides the button elsewhere. */
export const isAppleSignInAvailable = async (): Promise<boolean> =>
  Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());

/**
 * Apple stays native because there is no browser flow to share: on iOS the
 * system sheet is the only supported entry point.
 *
 * The name is the awkward part. Apple returns `fullName` ONLY on the very
 * first authorization for this app, never inside the identity token, and not
 * at all if the user declines to share it — so we back it up to user metadata
 * on the one pass where it exists. The profile row is already seeded by then
 * (the trigger fires on insert, before this runs), so in practice Apple users
 * get a `display_name` from the fallback chain — email local part, then
 * 'Player'. That is accepted, not a bug: `display_name` is renameable.
 */
export async function signInWithApple(): Promise<SignInOutcome> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in returned no identity token.');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;

    const nameParts = [
      credential.fullName?.givenName,
      credential.fullName?.familyName,
    ].filter((part): part is string => typeof part === 'string' && part !== '');

    if (nameParts.length > 0) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: nameParts.join(' ') },
      });
      // Deliberately not thrown: the user IS signed in at this point, and
      // failing the whole sign-in over a cosmetic, renameable name would be
      // the worse outcome.
      if (updateError !== null && __DEV__) {
        console.warn(
          `[auth] Apple sign-in succeeded but saving the name failed: ${updateError.message}`,
        );
      }
    }

    await setLastAuthMethod('apple');
    return 'signed-in';
  } catch (e) {
    // Apple signals a dismissed sheet with a thrown ERR_REQUEST_CANCELED.
    if (
      e !== null &&
      typeof e === 'object' &&
      'code' in e &&
      e.code === 'ERR_REQUEST_CANCELED'
    ) {
      return 'cancelled';
    }
    throw e;
  }
}

// ---- Email: passwordless OTP ----------------------------------------------

/**
 * Sends a 6-digit code. `shouldCreateUser` is what makes sign-in and sign-up
 * the same action — an unknown address creates the account.
 *
 * Requires the Supabase email template to expose `{{ .Token }}`; left at the
 * default `{{ .ConfirmationURL }}` the user receives a magic link and the code
 * screen has nothing to accept.
 */
export async function sendEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;

  await setLastAuthMethod('email');
}
