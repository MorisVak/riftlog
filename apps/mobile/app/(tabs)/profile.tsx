import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/authContext';
import { useProfile } from '@/contexts/profileContext';
import AuthGate from '@/components/authGate';
import Avatar from '@/components/avatar';
import Icon from '@/components/icon';
import RiotDisclaimer from '@/components/riotDisclaimer';
import { CARD_ART_PREVIEW } from '@/lib/featureFlags';
import DeckPicker from '@/components/deck/deckPicker';
import { setDefaultDeck } from '@/lib/profile';
import { fetchMyDecks, type Deck } from '@/lib/decks';
import FeedbackSheet from '@/components/feedbackSheet';
import { fetchFeedbackUnreadCount } from '@/lib/feedback';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

type DecksState = { kind: 'loading' } | { kind: 'ready'; decks: Deck[] } | { kind: 'error' };

/**
 * Profile tab: you and your settings — the identity header, the default deck,
 * feedback, and Riot's statements at the bottom. Decks have their own tab.
 * The handle is claimed at onboarding; the rename UI and stats come later.
 * Sections: Default deck, Feedback, Account (sign out).
 */
const Profile = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, status } = useAuth();
  const [decksState, setDecksState] = useState<DecksState>({ kind: 'loading' });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Unread feedback for the feedback admin; null for everyone else, which
  // also hides the inbox entry.
  const [feedbackUnread, setFeedbackUnread] = useState<number | null>(null);
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
      fetchFeedbackUnreadCount()
        .then((n) => active && setFeedbackUnread(n))
        .catch((e) => {
          if (__DEV__) console.warn('[feedback] unread count failed:', e);
        });
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

  // The default deck, shown optimistically while the save is in flight.
  const [pendingDefault, setPendingDefault] = useState<string | null | undefined>(undefined);
  const defaultDeckId =
    pendingDefault !== undefined ? pendingDefault : (profile?.defaultDeckId ?? null);
  const defaultDeck =
    decksState.kind === 'ready'
      ? (decksState.decks.find((d) => d.id === defaultDeckId) ?? null)
      : null;

  const chooseDefault = (deck: Deck | null) => {
    const id = deck?.id ?? null;
    setPendingDefault(id);
    setDefaultDeck(id)
      .then(() => refresh())
      .catch((e) => {
        if (__DEV__) console.warn('[profile] default deck save failed:', e);
        Alert.alert('Could not save', 'Please check your connection and try again.');
      })
      .finally(() => setPendingDefault(undefined));
  };

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
        <Text className="mb-4 h-11 font-display-bold text-2xl leading-[44px] text-ink-primary">
          Profile
        </Text>
      </Animated.View>

      {/* Who you are, as a card. Sign out lives in Account at the bottom,
          away from the name, where a stray tap can't reach it. */}
      <Animated.View
        style={headerStyle}
        className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-4"
      >
        <Avatar size={56} />

        <View className="flex-1">
          {/* Until the row loads, hold the header's shape with placeholders
              rather than a spinner, so nothing jumps when it arrives. A missing
              row (the seed trigger swallowed a failure) degrades the same way;
              onboarding repairs it. */}
          <Text className="font-display-bold text-lg text-ink-primary" numberOfLines={1}>
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
      </Animated.View>

      {profileStatus === 'error' && (
        <Text className="mt-4 text-center text-sm text-loss-text">
          {"Couldn't load your profile. Check your connection."}
        </Text>
      )}

      {/* The deck a new match starts with. Only once there are decks to
          choose from; the server clears it if that deck is deleted. */}
      {decksState.kind === 'ready' && decksState.decks.length > 0 && (
        <Animated.View style={decksStyle} className="mt-8">
          <Text className="mb-2 font-display text-base text-ink-secondary">Default deck</Text>
          <DeckPicker
            value={defaultDeck}
            onChange={chooseDefault}
            noneLabel="No default deck"
            title="Default deck"
            defaultDeckId={defaultDeckId}
          />
          <Text className="mt-1.5 px-1 text-[12px] leading-4 text-ink-tertiary">
            Picked for you when you start a match. Also on Home.
          </Text>
        </Animated.View>
      )}

      <Animated.View style={decksStyle} className="mt-8">
        <Text className="mb-2 font-display text-base text-ink-secondary">Feedback</Text>
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFeedbackOpen(true);
            }}
            className="min-h-[52px] flex-row items-center gap-3 px-4 active:bg-elevated"
          >
            <Icon name="message-square" size={17} className="text-accent" />
            <Text className="flex-1 font-display text-[15px] text-ink-primary">Send feedback</Text>
            <Icon name="chevron-right" size={16} className="text-ink-tertiary" />
          </TouchableOpacity>

          {/* Only the feedback admin gets the inbox; the server enforces it. */}
          {feedbackUnread !== null && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`View feedback, ${feedbackUnread} unread`}
              onPress={() => router.push('/feedback')}
              className="min-h-[52px] flex-row items-center gap-3 border-t border-border/60 px-4 active:bg-elevated"
            >
              <Icon name="inbox" size={17} className="text-ink-secondary" />
              <Text className="flex-1 font-display text-[15px] text-ink-primary">
                View feedback
              </Text>
              {feedbackUnread > 0 && (
                <View className="min-w-[22px] items-center rounded-full bg-accent px-1.5 py-0.5">
                  <Text className="font-display-bold text-[12px] text-background">
                    {feedbackUnread > 99 ? '99+' : feedbackUnread}
                  </Text>
                </View>
              )}
              <Icon name="chevron-right" size={16} className="text-ink-tertiary" />
            </TouchableOpacity>
          )}
        </View>
        <Text className="mt-1.5 px-1 text-[12px] leading-4 text-ink-tertiary">
          Tell us what you like and what to improve. It&apos;s sent anonymously.
        </Text>
      </Animated.View>

      {/* Account: sign out here (and, later, deleting the account). */}
      <Animated.View style={decksStyle} className="mt-8">
        <Text className="mb-2 font-display text-base text-ink-secondary">Account</Text>
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={confirmSignOut}
            className="min-h-[52px] flex-row items-center gap-3 px-4 active:bg-elevated"
          >
            <Icon name="log-out" size={17} className="text-ink-secondary" />
            <Text className="flex-1 font-display text-[15px] text-ink-primary">Sign out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Riot's statements: the ONE place in the app they appear, always,
          at the bottom of the page — small, but not behind a tap. */}
      <Animated.View style={decksStyle} className="mt-10 gap-3 px-1">
        <RiotDisclaimer />
        {/* A non-dev build with card art on (preview / testflight profile):
            must never be the one submitted to the App Store. */}
        {CARD_ART_PREVIEW && (
          <View className="flex-row items-center gap-1.5">
            <Icon name="image" size={12} className="text-ink-tertiary" />
            <Text className="font-mono-medium text-[11px] text-ink-tertiary">Card art preview</Text>
          </View>
        )}
      </Animated.View>

      <FeedbackSheet
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSent={() => {
          Alert.alert('Thanks!', 'Your feedback was sent.');
          // An admin sending feedback should see it land in the counter.
          if (feedbackUnread !== null) {
            fetchFeedbackUnreadCount()
              .then(setFeedbackUnread)
              .catch(() => {});
          }
        }}
      />
    </ScrollView>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
