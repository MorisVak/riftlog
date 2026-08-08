import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/authContext';
import {
  isAppleSignInAvailable,
  signInWithApple,
  signInWithDiscord,
  signInWithGoogle,
  sendEmailOtp,
} from '@/lib/auth';
import { getLastAuthMethod, type AuthMethod } from '@/lib/authPrefs';

// Icon `color` and placeholderTextColor are props, not classNames, so they take
// raw values. These mirror the design tokens 1:1 (see tailwind.config.js).
const ON_ACCENT = '#0D1B2A'; // background — ink used on an accent fill
const INK_PRIMARY = '#E4E5F2';
const INK_SECONDARY = '#868FB0';

/** Badges whichever method the user signed in with last (device-local). */
const LastUsedBadge = () => (
  <View className="rounded-full bg-background/20 px-2 py-0.5">
    <Text className="font-display text-[10px] uppercase tracking-wide text-background/70">
      Last used
    </Text>
  </View>
);

const SecondaryLastUsedDot = () => (
  <View className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
);

/**
 * The one login screen. Sign-in and sign-up are the SAME action — every "Sign
 * up" link in the app routes here, and an unknown email or a first-time OAuth
 * identity creates the account (and, via the Postgres trigger, its profile).
 *
 * Presented as a modal over whatever the user was doing, so dismissing returns
 * them in place rather than bouncing them through a redirect.
 */
const Login = () => {
  const router = useRouter();
  const { status } = useAuth();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<AuthMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useState<AuthMethod | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void getLastAuthMethod().then(setLastUsed);
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Dismiss on success from ANY path — including the OTP screen stacked above
  // this one, which signs in and pops itself. Watching auth state means there's
  // one dismissal rule instead of one per provider.
  useEffect(() => {
    if (status !== 'authed') return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [status, router]);

  const run = useCallback(
    async (method: AuthMethod, fn: () => Promise<unknown>) => {
      if (busy) return;
      setError(null);
      setBusy(method);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign-in failed.');
      } finally {
        setBusy(null);
      }
    },
    [busy],
  );

  const onEmailContinue = () =>
    run('email', async () => {
      await sendEmailOtp(email);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/verify-otp', params: { email: email.trim() } });
    });

  // Enough to catch a fat-fingered address without pretending to validate an
  // inbox — the OTP send is the real check.
  const emailUsable = /.+@.+\..+/.test(email.trim());

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8 flex-row justify-end">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => router.back()}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
            >
              <Feather name="x" size={17} color={INK_SECONDARY} />
            </TouchableOpacity>
          </View>

          <Text className="font-display-bold text-[28px] tracking-tight text-ink-primary">
            Sign in to Riftlog
          </Text>
          <Text className="mb-8 mt-2 text-[15px] leading-5 text-ink-secondary">
            Keep your match history and stats across devices. No account yet?
            Signing in creates one.
          </Text>

          {/* Discord — primary. Full width, accent fill. */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Continue with Discord"
            disabled={busy !== null}
            onPress={() => run('discord', signInWithDiscord)}
            className={`mb-3 flex-row items-center justify-center gap-2.5 rounded-full px-5 py-4 ${
              busy !== null
                ? 'bg-accent/50'
                : 'bg-accent shadow-accent-btn active:bg-accent-strong'
            }`}
          >
            {busy === 'discord' ? (
              <ActivityIndicator color={ON_ACCENT} />
            ) : (
              <>
                <Ionicons name="logo-discord" size={19} color={ON_ACCENT} />
                <Text className="font-display-bold text-base text-background">
                  Continue with Discord
                </Text>
                {lastUsed === 'discord' && <LastUsedBadge />}
              </>
            )}
          </TouchableOpacity>

          {/* Google + Apple — secondary, icon-only, side by side. */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              disabled={busy !== null}
              onPress={() => run('google', signInWithGoogle)}
              className="flex-1 items-center justify-center rounded-2xl border border-border bg-elevated py-3.5 active:bg-surface"
            >
              {busy === 'google' ? (
                <ActivityIndicator color={INK_SECONDARY} />
              ) : (
                <Ionicons name="logo-google" size={21} color={INK_PRIMARY} />
              )}
              {lastUsed === 'google' && <SecondaryLastUsedDot />}
            </TouchableOpacity>

            {appleAvailable && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                disabled={busy !== null}
                onPress={() => run('apple', signInWithApple)}
                className="flex-1 items-center justify-center rounded-2xl border border-border bg-elevated py-3.5 active:bg-surface"
              >
                {busy === 'apple' ? (
                  <ActivityIndicator color={INK_SECONDARY} />
                ) : (
                  <Ionicons name="logo-apple" size={21} color={INK_PRIMARY} />
                )}
                {lastUsed === 'apple' && <SecondaryLastUsedDot />}
              </TouchableOpacity>
            )}
          </View>

          <View className="my-7 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border" />
            <Text className="font-display text-[11px] uppercase tracking-wider text-ink-tertiary">
              or
            </Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="mb-2 flex-row items-center gap-2">
            <Text className="font-display text-xs uppercase tracking-wider text-ink-secondary">
              Email
            </Text>
            {lastUsed === 'email' && (
              <View className="rounded-full bg-accent/15 px-2 py-0.5">
                <Text className="font-display text-[10px] uppercase tracking-wide text-accent">
                  Last used
                </Text>
              </View>
            )}
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={INK_SECONDARY}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            returnKeyType="go"
            onSubmitEditing={() => emailUsable && onEmailContinue()}
            className="mb-4 rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary"
          />

          {/* No password field anywhere: a 6-digit code is the whole flow. */}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!emailUsable || busy !== null}
            onPress={onEmailContinue}
            className={`items-center rounded-full px-5 py-4 ${
              emailUsable && busy === null
                ? 'bg-accent shadow-accent-btn active:bg-accent-strong'
                : 'bg-elevated'
            }`}
          >
            {busy === 'email' ? (
              <ActivityIndicator color={INK_SECONDARY} />
            ) : (
              <Text
                className={`font-display-bold text-base uppercase tracking-wide ${
                  emailUsable ? 'text-background' : 'text-ink-tertiary'
                }`}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>

          {error !== null && (
            <Text className="mt-4 text-center text-sm text-loss-text">
              {error}
            </Text>
          )}

          <Text className="mt-8 text-center text-xs leading-4 text-ink-tertiary">
            We&apos;ll email you a 6-digit code — no password to remember.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;
