import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';
import { setLastAuthMethod } from '@/lib/authPrefs';

/**
 * Provider wiring. Every function here is a PLAIN sign-in: sign-in and sign-up
 * are the same action, and there is no anonymous conversion, no `linkIdentity`,
 * and no `updateUser` anywhere. A first-time user gets an account and a profile
 * row (seeded by the Postgres trigger); a returning user gets their session.
 *
 * Supabase's automatic email linking is left ON, so the same address across
 * Discord/Google/Apple resolves to one account. The known exception is Apple's
 * "Hide My Email" relay address, which can't match — see SPEC.md.
 *
 * Cancellation is not an error: the caller gets `'cancelled'` back rather than
 * a thrown exception, so a dismissed sheet doesn't paint a red message.
 */

// Closes any lingering auth session left over from a redirect that came back
// while the app was backgrounded.
WebBrowser.maybeCompleteAuthSession();

export type SignInOutcome = 'signed-in' | 'cancelled';

// ---- Discord: web redirect ------------------------------------------------

/**
 * Discord has no native SDK worth the surface area, so this is the browser
 * flow: open Supabase's authorize URL in an auth session, then trade the
 * tokens on the returned deep link for a session.
 */
export async function signInWithDiscord(): Promise<SignInOutcome> {
  const redirectTo = makeRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo,
      // We drive the browser ourselves; letting supabase-js redirect would
      // leave the app with no way to observe the result.
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Discord sign-in did not return an auth URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  // Tokens come back in the URL fragment, which Linking.parse doesn't read —
  // getQueryParams handles both `?` and `#`.
  const { params, errorCode } = getQueryParams(result.url);
  if (errorCode) throw new Error(errorCode);

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (!accessToken || !refreshToken) {
    throw new Error('Discord sign-in returned no session tokens.');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;

  await setLastAuthMethod('discord');
  return 'signed-in';
}

// ---- Google: native id-token ----------------------------------------------

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;

const configureGoogle = () => {
  if (googleConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. See apps/mobile/.env.example.',
    );
  }
  GoogleSignin.configure({
    // The WEB client id is what Google mints the id_token's audience against,
    // and it's the one Supabase verifies — not the iOS/Android client id.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
};

/**
 * Native flow: the system account picker hands us an id_token directly, so
 * there's no browser bounce. Requires a dev client — this does not work in
 * Expo Go.
 */
export async function signInWithGoogle(): Promise<SignInOutcome> {
  configureGoogle();
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return 'cancelled';

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google sign-in returned no id token.');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;

  await setLastAuthMethod('google');
  return 'signed-in';
}

// ---- Apple: native Sign in with Apple -------------------------------------

/** iOS-only; the login screen hides the button elsewhere. */
export const isAppleSignInAvailable = async (): Promise<boolean> =>
  Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());

/**
 * Apple returns the user's name ONLY on the very first authorization for this
 * app, and returns nothing at all if they decline to share it — so nothing here
 * depends on getting one. The profile trigger falls back to the email local
 * part and then to 'Player'.
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
