import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/authContext';

const ACCENT = '#8B93D9';
const INK_TERTIARY = '#5E6788';

/**
 * Persistent guest notice on Home. Renders nothing when signed in.
 *
 * Deliberately shown WHILE a guest plays rather than sprung on them at the
 * moment they'd lose something: a wall at the end of a match reads as a bait
 * and switch, and by then the match is already gone. Low-key on purpose — it's
 * a standing fact about the current mode, not an interruption, so it uses the
 * surface treatment rather than an accent fill and has no dismiss control.
 */
const GuestBanner = () => {
  const { status } = useAuth();
  const router = useRouter();

  if (status !== 'guest') return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Playing as guest. Sign in to keep your match history."
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/login');
      }}
      className="mb-3.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:bg-elevated"
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
        <Feather name="user-x" size={15} color={ACCENT} />
      </View>
      <View className="flex-1">
        <Text className="font-display text-[13px] text-ink-primary">
          Playing as guest — games aren&apos;t saved.
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink-secondary">
          Sign in to keep your match history.
        </Text>
      </View>
      <Feather name="chevron-right" size={17} color={INK_TERTIARY} />
    </Pressable>
  );
};

export default GuestBanner;
