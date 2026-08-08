import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { Profile as ProfileModel } from '@riftlog/core';
import { useAuth } from '@/contexts/authContext';
import { fetchMyProfile } from '@/lib/profile';
import AuthGate from '@/components/authGate';

const ACCENT = '#8B93D9';
const INK_SECONDARY = '#868FB0';

/**
 * Profile tab — read-only for now. Handles are auto-assigned at signup (see the
 * profiles trigger), so there is nothing to claim here; renaming, avatars, and
 * decks are the next slice. Sign out lives here because there's nowhere else
 * for it yet.
 */
const Profile = () => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
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
    }, []),
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
      <Text className="mb-7 font-display-bold text-2xl text-ink-primary">
        Profile
      </Text>

      <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        {profile?.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            className="h-16 w-16 rounded-full"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accent/15">
            <Feather name="user" size={26} color={ACCENT} />
          </View>
        )}

        <View className="flex-1">
          {!loaded ? (
            <ActivityIndicator color={INK_SECONDARY} />
          ) : (
            <>
              <Text
                className="font-display-bold text-lg text-ink-primary"
                numberOfLines={1}
              >
                {profile?.displayName ?? 'Player'}
              </Text>
              {/* The @handle is the unique identity; display name is cosmetic
                  and may collide. Absent only in the rare case the seeding
                  trigger swallowed a failure — degrade, don't crash. */}
              <Text className="mt-0.5 font-mono-medium text-[13px] text-accent">
                {profile ? `@${profile.username}` : '—'}
              </Text>
              {user?.email ? (
                <Text
                  className="mt-1 text-[12px] text-ink-tertiary"
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>

      {error !== null && (
        <Text className="mt-4 text-center text-sm text-loss-text">{error}</Text>
      )}

      <Text className="mt-4 px-1 text-[12px] leading-4 text-ink-tertiary">
        Stats, decks, and editing your handle are coming soon.
      </Text>

      <View className="flex-1" />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={confirmSignOut}
        className="mb-6 flex-row items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-4 active:bg-elevated"
      >
        <Feather name="log-out" size={16} color={INK_SECONDARY} />
        <Text className="font-display text-base text-ink-secondary">
          Sign out
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
