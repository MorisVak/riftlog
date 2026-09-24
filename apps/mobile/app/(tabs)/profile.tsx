import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/authContext';
import { useProfile } from '@/contexts/profileContext';
import AuthGate from '@/components/authGate';
import Avatar from '@/components/avatar';
import Icon from '@/components/icon';
import DeckRow from '@/components/deck/deckRow';
import { fetchMyDecks, type Deck } from '@/lib/decks';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

type DecksState = { kind: 'loading' } | { kind: 'ready'; decks: Deck[] } | { kind: 'error' };

/**
 * Profile tab: identity header, then "My decks". The handle is claimed at
 * onboarding; the rename UI and stats come later. Sign out sits in the header
 * because there's nowhere else for it yet.
 *
 * "My decks" is deliberately bare — a plain list plus an import entry point;
 * its final placement is still to be decided.
 */
const Profile = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, status } = useAuth();
  const [decksState, setDecksState] = useState<DecksState>({ kind: 'loading' });
  // Read from profileContext (the same row that drives the onboarding gate),
  // re-fetched on focus so a change made elsewhere shows up here.
  const { profile, profileStatus, refresh } = useProfile();
  const loaded = profileStatus === 'ready' || profileStatus === 'error';

  const titleIntro = useSharedValue(0);
  const headerIntro = useSharedValue(0);
  const decksIntro = useSharedValue(0);
  const titleStyle = useRise(titleIntro);
  const headerStyle = useRise(headerIntro);
  const decksStyle = useRise(decksIntro);

  useFocusEffect(
    useCallback(() => {
      // Replay on each focus, matching Home and History.
      playIntro([titleIntro, headerIntro, decksIntro]);
      void refresh();
      // Signed out, this screen renders behind the login gate; fetching
      // would only paint an RLS error under the blur.
      if (status !== 'authed') return;
      let active = true;
      fetchMyDecks()
        .then((decks) => {
          if (active) setDecksState({ kind: 'ready', decks });
        })
        .catch(() => {
          if (active) setDecksState({ kind: 'error' });
        });
      return () => {
        active = false;
      };
    }, [titleIntro, headerIntro, decksIntro, refresh, status]),
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

  const openImport = () => router.push('/decks/import');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 14,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
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

      {profileStatus === 'error' && (
        <Text className="mt-4 text-center text-sm text-loss-text">
          {"Couldn't load your profile. Check your connection."}
        </Text>
      )}

      <Animated.View style={decksStyle} className="mt-8">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-display text-xs uppercase tracking-wider text-ink-secondary">
            My decks
          </Text>
          {/* A real touch target (44pt tall), not a text link. */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Import deck"
            onPress={openImport}
            className="h-11 flex-row items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 active:bg-accent/25"
          >
            <Icon name="plus" size={17} className="text-accent" />
            <Text className="font-display text-[15px] text-accent">
              Import deck
            </Text>
          </TouchableOpacity>
        </View>

        {decksState.kind === 'loading' ? (
          <Text className="py-6 text-center text-sm text-ink-tertiary">
            Loading decks…
          </Text>
        ) : decksState.kind === 'error' ? (
          <Text className="py-6 text-center text-sm text-ink-secondary">
            {"Couldn't load your decks. Check your connection."}
          </Text>
        ) : decksState.decks.length === 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={openImport}
            className="items-center rounded-2xl border border-dashed border-border px-6 py-8 active:bg-surface"
          >
            <Icon name="layers" size={20} className="text-ink-tertiary" />
            <Text className="mt-2 font-display text-[15px] text-ink-primary">
              No decks yet
            </Text>
            <Text className="mt-1 text-center text-[13px] leading-[18px] text-ink-secondary">
              Paste a decklist from Piltover Archive to import your first deck.
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="gap-2.5">
            {decksState.decks.map((deck) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                onPress={() => router.push(`/decks/${deck.id}`)}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
