import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/auth';

const INK_SECONDARY = '#868FB0';
const INK_TERTIARY = '#5E6788';

const CODE_LENGTH = 6;
// Supabase rate-limits auth emails (2/hour by default). A visible countdown is
// cheaper than letting people burn the quota on impatient re-taps.
const RESEND_COOLDOWN_S = 60;

/**
 * Second half of the passwordless email flow: enter the 6-digit code from
 * `signInWithOtp`. Verifying establishes the session, which the login screen
 * below observes and dismisses on — so both modals unwind on success.
 *
 * Requires the Supabase email template to expose `{{ .Token }}`; at the default
 * `{{ .ConfirmationURL }}` the user gets a magic link and there's no code to
 * type here.
 */
const VerifyOtp = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  // The code that was last submitted, so the auto-submit effect can't fire the
  // same six digits twice while the request is in flight.
  const submitted = useRef<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const verify = useCallback(
    async (value: string) => {
      if (busy || !email) return;
      submitted.current = value;
      setError(null);
      setBusy(true);
      try {
        await verifyEmailOtp(email, value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Pop back to the login screen, which dismisses itself once it sees the
        // session land.
        if (router.canGoBack()) router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That code did not work.');
        setCode('');
        submitted.current = null;
      } finally {
        setBusy(false);
      }
    },
    [busy, email, router],
  );

  // Submit as soon as the last digit lands — nobody wants to reach for a button
  // after typing a code they just read off a screen.
  useEffect(() => {
    if (code.length === CODE_LENGTH && submitted.current !== code) {
      void verify(code);
    }
  }, [code, verify]);

  const resend = async () => {
    if (cooldown > 0 || busy || !email) return;
    setError(null);
    setBusy(true);
    try {
      await sendEmailOtp(email);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 px-6 pt-5"
      >
        <View className="mb-8 flex-row justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
          >
            <Feather name="arrow-left" size={17} color={INK_SECONDARY} />
          </TouchableOpacity>
        </View>

        <Text className="font-display-bold text-[28px] tracking-tight text-ink-primary">
          Enter your code
        </Text>
        <Text className="mb-8 mt-2 text-[15px] leading-5 text-ink-secondary">
          We sent a {CODE_LENGTH}-digit code to{' '}
          <Text className="text-ink-primary">{email}</Text>.
        </Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
          placeholder="000000"
          placeholderTextColor={INK_TERTIARY}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          autoFocus
          editable={!busy}
          className="rounded-xl border border-border bg-elevated px-4 py-4 text-center font-mono text-2xl tracking-[8px] text-ink-primary"
        />

        {busy && (
          <View className="mt-5 items-center">
            <ActivityIndicator color={INK_SECONDARY} />
          </View>
        )}

        {error !== null && (
          <Text className="mt-4 text-center text-sm text-loss-text">
            {error}
          </Text>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          disabled={cooldown > 0 || busy}
          onPress={resend}
          className="mt-7 items-center py-2"
        >
          <Text
            className={`font-display text-sm ${
              cooldown > 0 || busy ? 'text-ink-tertiary' : 'text-accent'
            }`}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyOtp;
