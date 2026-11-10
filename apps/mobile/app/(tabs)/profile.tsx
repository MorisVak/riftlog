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
import { LegendPortrait } from '@/components/deck/cardArt';
import { deleteMyAccount, revokeAppleSignIn, setDefaultDeck, setScoringMode } from '@/lib/profile';
import type { ScoringMode } from '@riftlog/core';
import { appleAuthorizationCode, usesAppleSignIn } from '@/lib/auth';
import type { Deck } from '@/lib/decks';
import { myDecksCache, useMyDecks } from '@/lib/sessionCache';
import FeedbackSheet from '@/components/feedbackSheet';
import ScoringSheet from '@/components/scoringSheet';
import { SCORING_LABEL } from '@/components/scoringChoice';
import { fetchFeedbackUnreadCount } from '@/lib/feedback';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

/** Same page as the website's header link (apps/web CoffeeLink). */
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/moriscodes';
// `background` mirrored for the gradient behind the status bar.
const STATUS_SHADE = ['#0D1B2A', '#0D1B2A00'] as const;

type DecksState = { kind: 'loading' } | { kind: 'ready'; decks: Deck[] } | { kind: 'error' };

/**
 * Profile tab: you and your settings. The identity card, then three
 * sections built from the same rows — Playing (default deck, scoring,
 * legend art), Riftlog (feedback, buy me a coffee), Account (sign out,
 * delete account) — and Riot's statements at the bottom. Decks have their
 * own tab. The handle is claimed at onboarding; the rename UI and stats
 * come later.
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

  const [scoringOpen, setScoringOpen] = useState(false);
  const chooseScoring = (mode: ScoringMode) => {
    if (mode === scoringMode) return;
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
        : 'Default';

  const hasDecks = decksState.kind === 'ready' && decksState.decks.length > 0;

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

        {/* Who you are. Sign out lives in Account at the bottom, away from
          the name, where a stray tap can't reach it. */}
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

        {/* Playing: how a match starts and looks. Each needs the profile
          loaded, so nothing shows a guess. */}
        {profile && (
          <Animated.View style={decksStyle}>
            <Section title="Playing">
              {/* The deck a new match starts with; the server clears it if
                that deck is deleted. Only once there are decks to pick. */}
              {hasDecks && (
                <DeckPicker
                  value={defaultDeck}
                  onChange={chooseDefault}
                  noneLabel="No default deck"
                  title="Default deck"
                  defaultDeckId={defaultDeckId}
                  renderTrigger={(open) => (
                    <Row
                      first
                      lead={
                        defaultDeck?.list.legend ? (
                          <LegendPortrait card={defaultDeck.list.legend} />
                        ) : (
                          <Icon name="layers" size={16} className="text-ink-secondary" />
                        )
                      }
                      label="Default deck"
                      value={defaultDeck?.name ?? 'None'}
                      onPress={open}
                    />
                  )}
                />
              )}

              {/* Opens the two boards with their previews. */}
              <Row
                first={!hasDecks}
                lead={<Icon name="sliders" size={16} className="text-ink-secondary" />}
                label="Scoring mode"
                value={SCORING_LABEL[scoringMode]}
                onPress={() => setScoringOpen(true)}
              />

              <Row
                lead={<Icon name="image" size={16} className="text-ink-secondary" />}
                label="Legend art"
                value={legendArtSummary}
                onPress={() => router.push('/legend-art')}
              />
            </Section>
          </Animated.View>
        )}

        {/* Riftlog itself: feedback, and the one way to chip in (opens the
          browser, same page as the website's header link). */}
        <Animated.View style={decksStyle}>
          <Section title="Riftlog">
            <Row
              first
              lead={<Icon name="message-square" size={16} className="text-ink-secondary" />}
              label="Send feedback"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFeedbackOpen(true);
              }}
            />
            {/* Only the feedback admin gets the inbox; the server enforces it. */}
            {feedbackUnread !== null && (
              <Row
                lead={<Icon name="inbox" size={16} className="text-ink-secondary" />}
                label="Feedback inbox"
                accessibilityLabel={`Feedback inbox, ${feedbackUnread} unread`}
                badge={
                  feedbackUnread > 0
                    ? feedbackUnread > 99
                      ? '99+'
                      : String(feedbackUnread)
                    : undefined
                }
                onPress={() => router.push('/feedback')}
              />
            )}
            <Row
              lead={<Icon name="coffee" size={16} className="text-ink-secondary" />}
              label="Buy me a coffee"
              link
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void Linking.openURL(BUY_ME_A_COFFEE_URL);
              }}
            />
          </Section>
        </Animated.View>

        <Animated.View style={decksStyle}>
          <Section title="Account">
            <Row
              first
              lead={<Icon name="log-out" size={16} className="text-ink-secondary" />}
              label="Sign out"
              chevron={false}
              onPress={confirmSignOut}
            />
            <Row
              danger
              lead={<Icon name="trash-2" size={16} className="text-loss-text" />}
              label={deleting ? 'Deleting account…' : 'Delete account'}
              chevron={false}
              disabled={deleting}
              onPress={confirmDeleteAccount}
            />
          </Section>
        </Animated.View>

        {/* Riot's statements: the ONE place in the app they appear, always,
          at the bottom of the page — small, but not behind a tap. */}
        <Animated.View style={decksStyle} className="mt-10 gap-3 px-1">
          <RiotDisclaimer />
        </Animated.View>

        <ScoringSheet
          visible={scoringOpen}
          value={scoringMode}
          onChange={chooseScoring}
          onClose={() => setScoringOpen(false)}
        />
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
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 10,
        }}
      />
    </View>
  );
};

/** A heading and one grouped card of rows — every section looks like this. */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mt-8">
    <Text className="mb-2 font-display text-base text-ink-secondary">{title}</Text>
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</View>
  </View>
);

/**
 * One row of a section: a round lead (an icon, or the default deck's legend),
 * the label, then a value or a badge, and a chevron (or an external-link
 * mark) when it opens something.
 */
const Row = ({
  lead,
  label,
  value,
  badge,
  onPress,
  first = false,
  danger = false,
  link = false,
  chevron = true,
  disabled = false,
  accessibilityLabel,
}: {
  lead: React.ReactNode;
  label: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  first?: boolean;
  danger?: boolean;
  link?: boolean;
  chevron?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) => {
  const content = (
    <>
      <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-elevated">
        {lead}
      </View>
      <View className="flex-1">
        <Text
          className={`font-display text-[15px] ${danger ? 'text-loss-text' : 'text-ink-primary'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      {value && (
        <Text className="max-w-[45%] text-[14px] text-ink-tertiary" numberOfLines={1}>
          {value}
        </Text>
      )}
      {badge && (
        <View className="min-w-[22px] items-center rounded-full bg-accent px-1.5 py-0.5">
          <Text className="font-display-bold text-[12px] text-background">{badge}</Text>
        </View>
      )}
      {onPress && link && <Icon name="external-link" size={15} className="text-ink-tertiary" />}
      {onPress && !link && chevron && (
        <Icon name="chevron-right" size={16} className="text-ink-tertiary" />
      )}
    </>
  );
  const rowClass = `min-h-[56px] flex-row items-center gap-3 px-4 py-2 ${
    first ? '' : 'border-t border-border/60'
  }`;
  if (!onPress) return <View className={rowClass}>{content}</View>;
  return (
    <TouchableOpacity
      accessibilityRole={link ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      className={`${rowClass} active:bg-elevated`}
    >
      {content}
    </TouchableOpacity>
  );
};

const ProfileTab = () => (
  <AuthGate>
    <Profile />
  </AuthGate>
);

export default ProfileTab;
