import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/authContext';
import { useProfile } from '@/contexts/profileContext';
import AuthGate from '@/components/authGate';
import Avatar from '@/components/avatar';
import Icon from '@/components/icon';
import RiotDisclaimer from '@/components/riotDisclaimer';
import DeckPicker from '@/components/deck/deckPicker';
import {
  deleteMyAccount,
  revokeAppleSignIn,
  setDefaultDeck,
  setScoringMode,
} from '@/lib/profile';
import type { ScoringMode } from '@riftlog/core';
import { appleAuthorizationCode, usesAppleSignIn } from '@/lib/auth';
import type { Deck } from '@/lib/decks';
import { myDecksCache, useMyDecks } from '@/lib/sessionCache';
import FeedbackSheet from '@/components/feedbackSheet';
import { fetchFeedbackUnreadCount } from '@/lib/feedback';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

/** Same page as the website's header link (apps/web CoffeeLink). */
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/moriscodes';
// `background` mirrored for the gradient behind the status bar.
const STATUS_SHADE = ['#0D1B2A', '#0D1B2A00'] as const;

/** Profile → Scoring: the two boards, each with one line on what it does. */
const SCORING_OPTIONS: { value: ScoringMode; label: string; hint: string }[] = [
  { value: 'detailed', label: 'Detailed', hint: 'Score each point as Conquer, Hold or Special.' },
  { value: 'simple', label: 'Simple', hint: 'A plain counter: + and −.' },
];

type DecksState = { kind: 'loading' } | { kind: 'ready'; decks: Deck[] } | { kind: 'error' };

/**
 * Profile tab: you and your settings — the identity header, the default deck,
 * feedback, and Riot's statements at the bottom. Decks have their own tab.
 * The handle is claimed at onboarding; the rename UI and stats come later.
 * Sections: Default deck, Scoring (detailed or simple board), Appearance
 * (legend art), Feedback, Support (buy me a coffee), Account (sign out,
 * delete account).
 */
const Profile = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, status, user } = useAuth();
  // Your decks from the session cache (shared with Home and Decks).
  const { data: cachedDecks, error: decksError } = useMyDecks();
  const decksState: DecksState = cachedDecks
    ? { kind: 'ready', decks: cachedDecks }
    : decksError
      ? { kind: 'error' }
      : { kind: 'loading' };
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
      void myDecksCache.refresh();
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

  // How the board scores, shown optimistically while the save is in flight.
  const [pendingScoring, setPendingScoring] = useState<ScoringMode | undefined>(undefined);
  const scoringMode = pendingScoring ?? profile?.scoringMode ?? 'detailed';

  const chooseScoring = (mode: ScoringMode) => {
    if (mode === scoringMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingScoring(mode);
    setScoringMode(mode)
      .then(() => refresh())
      .catch((e) => {
        if (__DEV__) console.warn('[profile] scoring mode save failed:', e);
        Alert.alert('Could not save', 'Please check your connection and try again.');
      })
      .finally(() => setPendingScoring(undefined));
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

  // In-app account deletion (App Store 5.1.1(v)): one clear, destructive
  // confirm, then the RPC removes the account and everything in it, and the
  // app signs out locally — back to the guest Home.
  const [deleting, setDeleting] = useState(false);
  const confirmDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete your account?',
      "This permanently deletes your profile, every match and every deck. It can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => void runDeletion(),
        },
      ],
    );
  };

  const deletionFailed = (e: unknown) => {
    if (__DEV__) console.warn('[profile] account deletion failed:', e);
    setDeleting(false);
    Alert.alert(
      'Could not delete',
      'Please check your connection and try again, or email support@riftlog.net.',
    );
  };

  const finishDeletion = async () => {
    await deleteMyAccount();
    await signOut();
    Alert.alert('Account deleted', 'Your account and its data are gone.');
  };

  // An account that signs in with Apple first has its Apple tokens revoked
  // (Apple asks for it): one more Apple confirmation gives a one-time code,
  // the `revoke-apple` function revokes with it. If Apple can't be reached,
  // deleting still matters more — the user may go ahead.
  const runDeletion = async () => {
    setDeleting(true);
    try {
      if (usesAppleSignIn(user)) {
        const code = await appleAuthorizationCode();
        if (code === 'cancelled') {
          setDeleting(false);
          return;
        }
        try {
          await revokeAppleSignIn(code);
        } catch (e) {
          if (__DEV__) console.warn('[profile] Apple revoke failed:', e);
          setDeleting(false);
          Alert.alert(
            'Couldn\u2019t disconnect Apple',
            'Your Apple sign-in couldn\u2019t be revoked right now. Delete the account anyway? You can also remove Riftlog later in Settings → Apple Account → Sign in with Apple.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete anyway',
                style: 'destructive',
                onPress: () => {
                  setDeleting(true);
                  finishDeletion().catch(deletionFailed);
                },
              },
            ],
          );
          return;
        }
      }
      await finishDeletion();
    } catch (e) {
      deletionFailed(e);
    }
  };

  // Profile → Legend art, summed up on its row.
  const legendPicks = Object.keys(profile?.legendArt.picks ?? {}).length;
  const legendArtSummary =
    legendPicks > 0
      ? `${legendPicks} picked`
      : profile?.legendArt.overnumbered
        ? 'Overnumbered'
        : 'Deck art';

  return (
    <View className="flex-1 bg-background">
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

        {/* How the board scores: say HOW each point was taken, or a plain
          counter. Read when a match starts, so a match in progress keeps its
          board. Only once the profile is loaded, so it never shows a guess. */}
        {profile && (
          <Animated.View style={decksStyle} className="mt-8">
            <Text className="mb-2 font-display text-base text-ink-secondary">Scoring</Text>
            <View
              accessibilityRole="radiogroup"
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              {SCORING_OPTIONS.map((o, i) => {
                const selected = o.value === scoringMode;
                return (
                  <TouchableOpacity
                    key={o.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${o.label}. ${o.hint}`}
                    onPress={() => chooseScoring(o.value)}
                    className={`min-h-[60px] flex-row items-center gap-3 px-4 py-2.5 active:bg-elevated ${
                      i > 0 ? 'border-t border-border/60' : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="font-display text-[15px] text-ink-primary">{o.label}</Text>
                      <Text className="mt-0.5 text-[13px] text-ink-tertiary">{o.hint}</Text>
                    </View>
                    {/* Shape + icon, not color alone. */}
                    <View
                      className={`h-[22px] w-[22px] items-center justify-center rounded-full ${
                        selected ? 'bg-accent' : 'border-2 border-ink-tertiary'
                      }`}
                    >
                      {selected && <Icon name="check" size={14} className="text-background" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className="mt-1.5 px-1 text-[12px] leading-4 text-ink-tertiary">
              Used from your next match. Graphs of simple games show the score only.
            </Text>
          </Animated.View>
        )}

        {/* Which art legends are drawn with. */}
        <Animated.View style={decksStyle} className="mt-8">
          <Text className="mb-2 font-display text-base text-ink-secondary">Appearance</Text>
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push('/legend-art')}
              className="min-h-[52px] flex-row items-center gap-3 px-4 active:bg-elevated"
            >
              <Icon name="image" size={17} className="text-accent" />
              <Text className="flex-1 font-display text-[15px] text-ink-primary">Legend art</Text>
              <Text className="text-[13px] text-ink-tertiary">{legendArtSummary}</Text>
              <Icon name="chevron-right" size={16} className="text-ink-tertiary" />
            </TouchableOpacity>
          </View>
        </Animated.View>

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
              <Text className="flex-1 font-display text-[15px] text-ink-primary">
                Send feedback
              </Text>
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

        {/* Support: Riftlog is free; this is the one way to chip in. Opens the
          browser (same page as the website's header link). */}
        <Animated.View style={decksStyle} className="mt-8">
          <Text className="mb-2 font-display text-base text-ink-secondary">Support</Text>
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <TouchableOpacity
              accessibilityRole="link"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void Linking.openURL(BUY_ME_A_COFFEE_URL);
              }}
              className="min-h-[52px] flex-row items-center gap-3 px-4 active:bg-elevated"
            >
              <Icon name="coffee" size={17} className="text-accent" />
              <Text className="flex-1 font-display text-[15px] text-ink-primary">
                Buy me a coffee
              </Text>
              <Icon name="external-link" size={15} className="text-ink-tertiary" />
            </TouchableOpacity>
          </View>
          <Text className="mt-1.5 px-1 text-[12px] leading-4 text-ink-tertiary">
            Riftlog is free. If you enjoy it, a coffee helps me keep building it.
          </Text>
        </Animated.View>

        {/* Account: sign out, and deleting the account for good. */}
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
            <TouchableOpacity
              accessibilityRole="button"
              disabled={deleting}
              onPress={confirmDeleteAccount}
              className="min-h-[52px] flex-row items-center gap-3 border-t border-border/60 px-4 active:bg-elevated"
            >
              <Icon name="trash-2" size={17} className="text-loss-text" />
              <Text className="flex-1 font-display text-[15px] text-loss-text">
                {deleting ? 'Deleting account…' : 'Delete account'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Riot's statements: the ONE place in the app they appear, always,
          at the bottom of the page — small, but not behind a tap. */}
        <Animated.View style={decksStyle} className="mt-10 gap-3 px-1">
          <RiotDisclaimer />
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
      {/* A shade behind the status bar, so the time and battery never sit on
          top of the content as it scrolls (as on Home). */}
      <LinearGradient
        colors={STATUS_SHADE}
        locations={[0.6, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 10 }}
      />
    </View>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
