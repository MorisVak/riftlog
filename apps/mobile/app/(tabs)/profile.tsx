import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Profile as ProfileModel } from '@riftlog/core';
import { useAuth } from '@/contexts/authContext';
import { fetchMyProfile } from '@/lib/profile';
import AuthGate from '@/components/authGate';
import Avatar from '@/components/avatar';
import Icon from '@/components/icon';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

/**
 * Profile tab — read-only for now. The handle is claimed at onboarding; the
 * rename UI, stats, and decks come later. Sign out sits in the header because
 * there's nowhere else for it yet.
 */
const Profile = () => {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const titleIntro = useSharedValue(0);
  const headerIntro = useSharedValue(0);
  const noteIntro = useSharedValue(0);
  const titleStyle = useRise(titleIntro);
  const headerStyle = useRise(headerIntro);
  const noteStyle = useRise(noteIntro);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      // Replay on each focus, matching Home and History.
      playIntro([titleIntro, headerIntro, noteIntro]);
      fetchMyProfile()
        .then((p) => {
          if (!active) return;
          setProfile(p);
          setLoaded(true);
        })
        .catch((e) => {
          if (!active) return;
          setError(e?.message ?? 'Failed to load profile');
          setLoaded(true);
        });
      return () => {
        active = false;
      };
    }, [titleIntro, headerIntro, noteIntro]),
  );

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your matches stay in your account. Any match in progress on this device is discarded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  };

  return (
    <View
      className="flex-1 bg-background px-5"
      style={{ paddingTop: insets.top + 14 }}
    >
      <Animated.View style={titleStyle}>
        <Text className="mb-7 font-display-bold text-2xl text-ink-primary">
          Profile
        </Text>
      </Animated.View>

      <Animated.View style={headerStyle} className="flex-row items-center gap-4">
        <Avatar size={64} />

        <View className="flex-1">
          {/* Until the row loads, hold the header's shape with placeholders
              rather than a spinner, so nothing jumps when it arrives. A missing
              row (the seed trigger swallowed a failure) degrades the same way;
              onboarding repairs it. */}
          <Text
            className="font-display-bold text-lg text-ink-primary"
            numberOfLines={1}
          >
            {profile?.displayName ?? (loaded ? 'Player' : ' ')}
          </Text>
          {/* The @handle is the unique identity; display name is cosmetic
              and may collide. */}
          <Text
            className="mt-0.5 font-mono-medium text-[13px] text-ink-secondary"
            numberOfLines={1}
          >
            {profile ? `@${profile.username}` : loaded ? '—' : ' '}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={confirmSignOut}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface active:bg-elevated"
        >
          <Icon name="log-out" size={17} className="text-ink-secondary" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={noteStyle}>
        {error !== null && (
          <Text className="mt-4 text-center text-sm text-loss-text">
            {error}
          </Text>
        )}

        <Text className="mt-6 px-1 text-[12px] leading-4 text-ink-tertiary">
          Stats and decks are coming soon.
        </Text>
      </Animated.View>
    </View>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
