import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/authContext';
import { useMatch } from '@/contexts/matchContext';
import GuestBanner from '@/components/guestBanner';
import PlayField from '@/components/playField';
import GameStartIntro from '@/components/gameStartIntro';
import BetweenGamesScreen from '@/components/betweenGamesScreen';
import MatchOverview from '@/components/matchOverview';
import { SCREEN_ENTER } from '@/components/transitions';
import MatchSetup from '@/components/matchSetup';
import RecentMatchRow from '@/components/recentMatchRow';
import DeckPicker from '@/components/deck/deckPicker';
import HeroCard, { type HeroDeckState } from '@/components/home/heroCard';
import FormStrip from '@/components/home/formStrip';
import DeckStrip from '@/components/home/deckStrip';
import { useProfile } from '@/contexts/profileContext';
import { setDefaultDeck } from '@/lib/profile';
import { fetchMyDecks, type Deck } from '@/lib/decks';
import { fetchMatchHistory, type MatchWithGames } from '@/lib/matchPersistence';
import { toHistoryRowVM } from '@/lib/historyView';
import { playIntro, useRise } from '@/hooks/useScreenIntro';
import { useInGameScreen } from '@/hooks/useInGameScreen';

const BACKGROUND = '#0D1B2A'; // for Feather icons inside accent fills
// `background` mirrored for the gradient behind the status bar.
const STATUS_SHADE = ['#0D1B2A', '#0D1B2A00'] as const;
const ACCENT = '#8B93D9';

const HistoryEmptyState = () => (
  <View className="rounded-2xl border border-border bg-surface px-6 py-8">
    <Text className="text-center font-display text-base text-ink-primary">
      No saved matches yet
    </Text>
    <Text className="mt-2 text-center text-sm text-ink-secondary">
      Play your first match to start a history.
    </Text>
  </View>
);

/** What a guest sees where recent matches would be. The banner above already
 *  says games aren't saved; this says what they'd be getting instead. */
const GuestRecentState = () => (
  <View className="rounded-2xl border border-border bg-surface px-6 py-8">
    <Text className="text-center font-display text-base text-ink-primary">
      No history in guest mode
    </Text>
    <Text className="mt-2 text-center text-sm text-ink-secondary">
      Sign in and every match you finish is saved here automatically.
    </Text>
  </View>
);

const Home = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status } = useAuth();
  const authed = status === 'authed';
  const [setupOpen, setSetupOpen] = useState(false);
  const [rows, setRows] = useState<MatchWithGames[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headerIntro = useSharedValue(0);
  const ctaIntro = useSharedValue(0);
  const recentIntro = useSharedValue(0);
  const decksIntro = useSharedValue(0);
  const headerStyle = useRise(headerIntro);
  const ctaStyle = useRise(ctaIntro);
  const recentStyle = useRise(recentIntro);
  const decksStyle = useRise(decksIntro);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      // Replay the intro on each focus, staggering the elements top-to-bottom
      // (header → hero → matches) so the screen assembles dynamically
      // rather than fading in all at once, matching the other tabs.
      playIntro([headerIntro, ctaIntro, recentIntro, decksIntro]);
      // Home is the one guest-usable screen, so it must not touch the network
      // while signed out — stats read as zeroes and the recent list explains
      // itself instead.
      if (!authed) {
        return () => {
          active = false;
        };
      }
      fetchMatchHistory()
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message ?? 'Failed to load matches'));
      fetchMyDecks()
        .then((d) => active && setDecks(d))
        .catch(() => active && setDecks((cur) => cur ?? []));
      return () => {
        active = false;
      };
    }, [authed, headerIntro, ctaIntro, recentIntro, decksIntro]),
  );

  const vms = useMemo(() => (rows ?? []).map(toHistoryRowVM), [rows]);
  // Two: the form strip above already shows the last ten results.
  const recent = useMemo(() => vms.slice(0, 2), [vms]);

  // "Default deck": the deck a new match starts with — your default deck (the
  // setup sheet preselects it). Choosing one here sets the default, as on
  // Profile. Your decks are read for it on focus; none yet → an import card.
  const { profile, refresh: refreshProfile } = useProfile();
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [pendingDefault, setPendingDefault] = useState<string | null | undefined>(undefined);
  const defaultDeckId =
    pendingDefault !== undefined ? pendingDefault : (profile?.defaultDeckId ?? null);
  const defaultDeck = decks?.find((d) => d.id === defaultDeckId) ?? null;
  const heroState: HeroDeckState =
    status === 'guest'
      ? { kind: 'guest' }
      : decks === null
        ? { kind: 'loading' }
        : defaultDeck
          ? { kind: 'deck', deck: defaultDeck }
          : decks.length > 0
            ? { kind: 'none' }
            : { kind: 'empty' };
  const chooseDefault = (deck: Deck | null) => {
    const id = deck?.id ?? null;
    setPendingDefault(id);
    setDefaultDeck(id)
      .then(() => refreshProfile())
      .catch((e) => {
        if (__DEV__) console.warn('[home] default deck save failed:', e);
        Alert.alert('Could not save', 'Please check your connection and try again.');
      })
      .finally(() => setPendingDefault(undefined));
  };

  // A guest never fetches, so `rows === null` isn't "still loading" for them.
  // Session restore counts as loading though — otherwise every cold start
  // flashes the guest state at a signed-in user before the session resolves.
  const loading = status === 'loading' || (authed && rows === null && error === null);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 14,
          paddingBottom: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header. No profile button: Profile is a tab. */}
        <Animated.View
          style={headerStyle}
          className="mb-4 mt-1 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent">
              <Feather name="hexagon" size={16} color={BACKGROUND} />
            </View>
            <Text className="font-display-bold text-[21px] tracking-tight text-ink-primary">
              Riftlog
            </Text>
          </View>
        </Animated.View>

        {/* Guest notice. Renders nothing when signed in; rides the header's
            entrance so it doesn't pop in against the staggered intro. */}
        <Animated.View style={headerStyle}>
          <GuestBanner />
        </Animated.View>

        {/* The hero: Start a match on your default deck's legend, with the
            deck named in its corner and Change beside it. */}
        <Animated.View style={ctaStyle}>
          <DeckPicker
            value={defaultDeck}
            onChange={chooseDefault}
            noneLabel="No default deck"
            title="Default deck"
            defaultDeckId={defaultDeckId}
            renderTrigger={(openDecks) => (
              <HeroCard
                state={heroState}
                onStart={() => setSetupOpen(true)}
                onChange={openDecks}
                onImport={() => router.push('/decks/import')}
              />
            )}
          />
        </Animated.View>

        {/* Recent matches */}
        <Animated.View style={recentStyle}>
          <View className="mb-2.5 mt-5 flex-row items-baseline justify-between px-0.5">
            <Text className="font-display-bold text-[15px] text-ink-primary">Your matches</Text>
            <Pressable onPress={() => router.navigate('/history')}>
              <Text className="text-[13px] font-semibold text-accent">See all</Text>
            </Pressable>
          </View>

          {/* Your form — the last ten results and your record. Your own
              saved matches, so none for a guest. */}
          {authed && !loading && error === null && vms.length > 0 && (
            <View className="mb-2">
              <FormStrip vms={vms} />
            </View>
          )}
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : status === 'guest' ? (
            <GuestRecentState />
          ) : error !== null ? (
            <View className="rounded-2xl border border-border bg-surface px-6 py-8">
              <Text className="text-center text-sm text-loss-text">{error}</Text>
            </View>
          ) : recent.length === 0 ? (
            <HistoryEmptyState />
          ) : (
            <View className="gap-2">
              {recent.map((vm) => (
                <RecentMatchRow
                  key={vm.id}
                  vm={vm}
                  onPress={() => router.push(`/matches/${vm.id}`)}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Your decks — what you play with, each with your record. Signed
            in with at least one deck (with none, the hero offers Import). */}
        {authed && decks !== null && decks.length > 0 && (
          <Animated.View style={decksStyle}>
            <View className="mb-2.5 mt-5 flex-row items-baseline justify-between px-0.5">
              <Text className="font-display-bold text-[15px] text-ink-primary">Your decks</Text>
              <Pressable onPress={() => router.navigate('/decks')}>
                <Text className="text-[13px] font-semibold text-accent">See all</Text>
              </Pressable>
            </View>
            <DeckStrip
              decks={decks}
              vms={vms}
              defaultDeckId={defaultDeckId}
              onOpen={(deck) => router.push(`/decks/${deck.id}`)}
              onImport={() => router.push('/decks/import')}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* Home scrolls now: a shade behind the status bar, so the time and
          battery never sit on top of the content. */}
      <LinearGradient
        colors={STATUS_SHADE}
        locations={[0.6, 1]}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 10 }}
      />

      {setupOpen && <MatchSetup onClose={() => setSetupOpen(false)} />}
    </View>
  );
};

const Index = () => {
  const { phase } = useMatch();
  useInGameScreen(phase);

  if (phase === 'over') {
    return (
      <View className="flex-1 bg-background">
        <Animated.View entering={SCREEN_ENTER} className="flex-1">
          <MatchOverview />
        </Animated.View>
      </View>
    );
  }

  if (phase === 'between-games') {
    return (
      <View className="flex-1 bg-background">
        <Animated.View entering={SCREEN_ENTER} className="flex-1">
          <BetweenGamesScreen />
        </Animated.View>
      </View>
    );
  }

  if (phase === 'playing') {
    return (
      <View className="flex-1 bg-background">
        <PlayField />
        {/* The "VS" intro at the start of each game; renders nothing
            otherwise. */}
        <GameStartIntro />
      </View>
    );
  }

  // phase === 'idle' — home
  return <Home />;
};

export default Index;
