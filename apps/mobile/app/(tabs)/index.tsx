import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import PlayField from '@/components/playField';
import BetweenGamesScreen from '@/components/betweenGamesScreen';
import MatchOverview from '@/components/matchOverview';
import MatchSetup from '@/components/matchSetup';
import RecentMatchRow from '@/components/recentMatchRow';
import {
  fetchMatchHistory,
  type MatchWithGames,
} from '@/lib/matchPersistence';
import { toHistoryRowVM, type HistoryRowVM } from '@/lib/historyView';

const BACKGROUND = '#0D1B2A'; // for Feather icons inside accent fills
const ACCENT = '#8B93D9';

// Screen intro, matching the History tab's `.scr` / scrIn: fade + slight rise.
const SCREEN_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const INTRO_MS = 340;
// Small offset between each element's entrance so the screen assembles
// top-to-bottom (header → CTA → stats → recent) instead of all at once.
const STAGGER_MS = 80;

// A staggered entrance driven by a 0→1 shared value: fade in while rising a few
// px. Each element drives its own value, kicked off at a progressively later
// delay (see the focus effect).
const useRise = (sv: SharedValue<number>) =>
  useAnimatedStyle(() => ({
    opacity: sv.value,
    transform: [{ translateY: (1 - sv.value) * 10 }],
  }));

// Stats derived from the device owner's own matches (Riot-policy safe — own
// stats only). Win rate ignores draws; with no decisive games it reads "–".
type HomeStats = { wins: number; losses: number; winRate: string };

const deriveStats = (vms: HistoryRowVM[]): HomeStats => {
  const wins = vms.filter((v) => v.result === 'win').length;
  const losses = vms.filter((v) => v.result === 'loss').length;
  const decided = wins + losses;
  const winRate = decided === 0 ? '–' : `${Math.round((wins / decided) * 100)}%`;
  return { wins, losses, winRate };
};

const StatCell = ({
  value,
  label,
  color,
  last,
}: {
  value: string | number;
  label: string;
  color: string;
  last?: boolean;
}) => (
  <View className={`flex-1 px-2 py-5 ${last ? '' : 'border-r border-border'}`}>
    <Text className={`text-center font-mono text-xl ${color}`}>{value}</Text>
    <Text className="mt-1 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-secondary">
      {label}
    </Text>
  </View>
);

const HistoryEmptyState = () => (
  <View className="rounded-2xl border border-border bg-surface px-6 py-8">
    <Text className="text-center font-display text-base text-ink-primary">
      No saved matches yet
    </Text>
    <Text className="mt-2 text-center text-sm text-ink-secondary">
      Play your first match to start a history. Sign-in &amp; cloud sync are
      coming soon.
    </Text>
  </View>
);

const Home = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [setupOpen, setSetupOpen] = useState(false);
  const [rows, setRows] = useState<MatchWithGames[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headerIntro = useSharedValue(0);
  const ctaIntro = useSharedValue(0);
  const statsIntro = useSharedValue(0);
  const recentIntro = useSharedValue(0);
  const headerStyle = useRise(headerIntro);
  const ctaStyle = useRise(ctaIntro);
  const statsStyle = useRise(statsIntro);
  const recentStyle = useRise(recentIntro);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      // Replay the intro on each focus, staggering the elements top-to-bottom
      // (header → CTA → stats → recent) so the screen assembles dynamically
      // rather than fading in all at once, matching the History tab.
      [headerIntro, ctaIntro, statsIntro, recentIntro].forEach((sv, i) => {
        sv.value = 0;
        sv.value = withDelay(
          i * STAGGER_MS,
          withTiming(1, { duration: INTRO_MS, easing: SCREEN_EASING }),
        );
      });
      fetchMatchHistory()
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message ?? 'Failed to load matches'));
      return () => {
        active = false;
      };
    }, [headerIntro, ctaIntro, statsIntro, recentIntro]),
  );

  const vms = useMemo(() => (rows ?? []).map(toHistoryRowVM), [rows]);
  const recent = useMemo(() => vms.slice(0, 3), [vms]);
  const stats = useMemo(() => deriveStats(vms), [vms]);

  const loading = rows === null && error === null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 14,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <Animated.View
          style={headerStyle}
          className="mb-6 mt-1 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent">
              <Feather name="hexagon" size={16} color={BACKGROUND} />
            </View>
            <Text className="font-display-bold text-[21px] tracking-tight text-ink-primary">
              Riftlog
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.navigate('/profile')}
            className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
          >
            <Feather name="user" size={18} color={ACCENT} />
          </Pressable>
        </Animated.View>

        {/* Start CTA */}
        <Animated.View style={ctaStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a match"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSetupOpen(true);
          }}
          className="rounded-[20px] bg-accent shadow-accent-card active:bg-accent-strong"
        >
          {/* overflow-hidden lives on this inner wrapper, not the Pressable, so
              it clips the decorative rings without clipping the card's own
              accent drop shadow (iOS clips a view's shadow when overflow is
              hidden on the same view). */}
          <View className="overflow-hidden rounded-[20px] p-6">
            {/* Decorative rings */}
            <View className="absolute -right-8 -top-8 h-[140px] w-[140px] rounded-full border border-background/15" />
            <View className="absolute -bottom-11 right-1.5 h-[110px] w-[110px] rounded-full border border-background/10" />
            <View className="flex-row items-center gap-3.5">
              <View className="h-[52px] w-[52px] items-center justify-center rounded-[15px] bg-background/15">
                <Feather name="play" size={20} color={BACKGROUND} />
              </View>
              <View>
                <Text className="font-display-bold text-[19px] tracking-tight text-background">
                  Start a match
                </Text>
                <Text className="mt-0.5 text-[13px] font-medium text-background/60">
                  Track score live, log it forever
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
        </Animated.View>

        {/* Season stats */}
        <Animated.View
          style={statsStyle}
          className="mt-3.5 flex-row overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <StatCell value={stats.wins} label="Wins" color="text-win-text" />
          <StatCell value={stats.losses} label="Losses" color="text-loss-text" />
          <StatCell value={stats.winRate} label="Win rate" color="text-accent" last />
        </Animated.View>

        {/* Recent matches */}
        <Animated.View style={recentStyle}>
        <View className="mb-3 mt-6 flex-row items-baseline justify-between px-0.5">
          <Text className="font-display-bold text-[15px] text-ink-primary">
            Recent matches
          </Text>
          <Pressable onPress={() => router.navigate('/history')}>
            <Text className="text-[13px] font-semibold text-accent">See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={ACCENT} />
          </View>
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
                onPress={() => router.navigate('/history')}
              />
            ))}
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {setupOpen && <MatchSetup onClose={() => setSetupOpen(false)} />}
    </View>
  );
};

const Index = () => {
  const { phase } = useMatch();

  if (phase === 'over') {
    return (
      <View className="flex-1 bg-background">
        <MatchOverview />
      </View>
    );
  }

  if (phase === 'between-games') {
    return (
      <View className="flex-1 bg-background">
        <BetweenGamesScreen />
      </View>
    );
  }

  if (phase === 'playing') {
    return (
      <View className="flex-1 bg-background">
        <PlayField />
      </View>
    );
  }

  // phase === 'idle' — home
  return <Home />;
};

export default Index;
