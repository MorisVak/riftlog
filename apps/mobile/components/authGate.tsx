import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/authContext';

// Feather's `color` is a prop, not a class — this mirrors the `accent` token.
const ACCENT = '#8B93D9';

/**
 * Wraps an account-only tab. Signed out, the tab's REAL content still renders —
 * blurred, dimmed, and inert — under a login card. It is deliberately not a
 * redirect: a guest who taps History should see their history-shaped screen sat
 * behind a lock, because that's what makes an account worth making. Bouncing
 * them to a login route shows them nothing and tells them less.
 *
 * The blur covers this screen only, so the tab bar stays live and a guest can
 * still move around the app.
 */
const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { status } = useAuth();
  const router = useRouter();

  if (status === 'authed') return <>{children}</>;

  // Session restore is async. Painting the gate during it would flash a lock
  // over every account tab on every cold start, including for signed-in users.
  if (status === 'loading') return <View className="flex-1 bg-background" />;

  const toLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/login');
  };

  return (
    <View className="flex-1 bg-background">
      {/* Inert, not hidden: the content underneath is scenery. */}
      <View pointerEvents="none" className="flex-1">
        {children}
      </View>

      {/* BlurView takes a style object, not a className — NativeWind doesn't
          map classes onto third-party native components without cssInterop. */}
      <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />

      <Animated.View
        entering={FadeIn.duration(220)}
        className="absolute inset-0 items-center justify-center bg-background/50 px-8"
      >
        <View className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6">
          <View className="mb-4 h-11 w-11 items-center justify-center self-center rounded-2xl bg-accent/15">
            <Feather name="lock" size={20} color={ACCENT} />
          </View>

          <Text className="text-center font-display-bold text-xl text-ink-primary">
            You need to log in to use this feature!
          </Text>
          <Text className="mb-6 mt-2 text-center text-sm leading-5 text-ink-secondary">
            Your matches, stats, and profile live with your account.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={toLogin}
            className="items-center rounded-full bg-accent px-5 py-4 shadow-accent-btn active:bg-accent-strong"
          >
            <Text className="font-display-bold text-base text-background">
              Log in
            </Text>
          </TouchableOpacity>

          {/* Same destination as "Log in" — signing in IS signing up. The link
              exists because a new user won't read a "Log in" button as an
              invitation. */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={toLogin}
            className="mt-2 px-5 py-3"
          >
            <Text className="text-center text-sm text-ink-secondary">
              No account yet?{' '}
              <Text className="font-display text-accent">Sign up!</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default AuthGate;
