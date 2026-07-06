import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
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
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deleteMatch,
  fetchMatchHistory,
  type MatchWithGames,
} from '@/lib/matchPersistence';
import { toHistoryRowVM, type HistoryRowVM } from '@/lib/historyView';
import HistoryRow from '@/components/historyRow';

/**
 * History tab. Reads the signed-in user's matches (with their games) from
 * Postgres on focus — history is never mirrored locally (Slice 2, online path).
 * RLS scopes the result to the caller's own rows. The device owner is player
 * p1, so results read from p1's perspective.
 */

const FILTERS = ['All', 'Wins', 'Losses', 'BO3'] as const;
type Filter = (typeof FILTERS)[number];

// Height of the floating header content (below the safe-area inset): the
// title/count row plus the filter-chip row.
const HEADER_H = 104;
const BACKGROUND = '#0D1B2A';

// Screen intro, matching the design's `.scr` / scrIn: fade + slight rise.
const SCREEN_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const INTRO_MS = 340;
// Small offset between each element's entrance so the screen assembles
// top-to-bottom (title → filters → matches) instead of all at once.
const STAGGER_MS = 80;

// A staggered entrance driven by a 0→1 shared value: fade in while rising a few
// px. Each element drives its own value, kicked off at a progressively later
// delay (see the focus effect).
const useRise = (sv: SharedValue<number>) =>
  useAnimatedStyle(() => ({
    opacity: sv.value,
    transform: [{ translateY: (1 - sv.value) * 10 }],
  }));

const matches = (vm: HistoryRowVM, filter: Filter) => {
  switch (filter) {
    case 'Wins':
      return vm.result === 'win';
    case 'Losses':
      return vm.result === 'loss';
    case 'BO3':
      return vm.format === 'BO3';
    default:
      return true;
  }
};

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`rounded-full border px-3.5 py-1.5 ${
      active ? 'border-accent bg-accent' : 'border-border bg-surface'
    }`}
  >
    <Text
      className={`font-display text-[13px] font-semibold ${
        active ? 'text-background' : 'text-ink-secondary'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

const Header = ({
  count,
  filter,
  onFilter,
  titleIntro,
  filterIntro,
  dividerIntro,
}: {
  count: number | null;
  filter: Filter;
  onFilter: (f: Filter) => void;
  titleIntro: SharedValue<number>;
  filterIntro: SharedValue<number>;
  dividerIntro: SharedValue<number>;
}) => {
  const insets = useSafeAreaInsets();
  const titleStyle = useRise(titleIntro);
  const filterStyle = useRise(filterIntro);
  // The hairline divider fades in on its own step, after the title and filters
  // have settled. Opacity only (no rise) so the line doesn't slide.
  const lineStyle = useAnimatedStyle(() => ({ opacity: dividerIntro.value }));
  return (
    <View
      className="absolute inset-x-0 top-0 z-10"
      style={{ paddingTop: insets.top }}
    >
      <BlurView tint="dark" intensity={48}>
        <View style={{ height: HEADER_H }} className="justify-end px-4 pb-3">
          <Animated.View
            style={titleStyle}
            className="flex-row items-baseline justify-between px-0.5"
          >
            <Text className="font-display-bold text-2xl text-ink-primary">
              History
            </Text>
            {count !== null ? (
              <Text className="text-[13px] text-ink-secondary">
                {count} {count === 1 ? 'match' : 'matches'}
              </Text>
            ) : null}
          </Animated.View>
          <Animated.View style={filterStyle} className="mt-3 flex-row gap-2">
            {FILTERS.map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={filter === f}
                onPress={() => onFilter(f)}
              />
            ))}
          </Animated.View>
        </View>
        <Animated.View style={lineStyle} className="h-px w-full bg-border" />
      </BlurView>
      {/* Soft fade so rows dissolve into the header as they scroll up. */}
      <LinearGradient
        colors={[BACKGROUND, 'transparent']}
        className="h-3 w-full"
        pointerEvents="none"
      />
    </View>
  );
};

const History = () => {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<MatchWithGames[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const titleIntro = useSharedValue(0);
  const filterIntro = useSharedValue(0);
  const dividerIntro = useSharedValue(0);
  const listIntro = useSharedValue(0);
  const listStyle = useRise(listIntro);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      // Replay the intro on each focus, staggering the elements top-to-bottom
      // (title → filters → matches) so the screen assembles dynamically rather
      // than fading in all at once (design `.scr` / scrIn).
      [titleIntro, filterIntro, dividerIntro, listIntro].forEach((sv, i) => {
        sv.value = 0;
        sv.value = withDelay(
          i * STAGGER_MS,
          withTiming(1, { duration: INTRO_MS, easing: SCREEN_EASING }),
        );
      });
      fetchMatchHistory()
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message ?? 'Failed to load history'));
      return () => {
        active = false;
      };
    }, [titleIntro, filterIntro, dividerIntro, listIntro]),
  );

  const vms = useMemo(() => (rows ?? []).map(toHistoryRowVM), [rows]);
  const visible = useMemo(
    () => vms.filter((vm) => matches(vm, filter)),
    [vms, filter],
  );

  const toggle = useCallback(
    (id: string) => setExpandedId((cur) => (cur === id ? null : id)),
    [],
  );

  // Optimistically drop the row, then delete from Postgres (cascade removes its
  // games). On failure, restore the row so the list stays truthful.
  const handleDelete = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : cur));
    let removed: MatchWithGames | undefined;
    setRows((cur) => {
      if (!cur) return cur;
      removed = cur.find((m) => m.id === id);
      return cur.filter((m) => m.id !== id);
    });
    deleteMatch(id).catch((e) => {
      setRows((cur) =>
        cur && removed
          ? [...cur, removed].sort((a, b) => b.ended_at.localeCompare(a.ended_at))
          : cur,
      );
      Alert.alert('Could not delete', e?.message ?? 'Please try again.');
    });
  }, []);

  const topPad = insets.top + HEADER_H + 12;

  const loading = rows === null && error === null;
  const count = error === null && rows !== null ? vms.length : null;

  let body;
  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center" style={{ paddingTop: topPad }}>
        <ActivityIndicator color="#8B93D9" />
      </View>
    );
  } else if (error !== null) {
    body = (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingTop: topPad }}
      >
        <Text className="text-center text-sm text-loss-text">{error}</Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <HistoryRow
            vm={item}
            index={index}
            expanded={expandedId === item.id}
            onToggle={toggle}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View className="items-center px-6 pt-20">
            <Text className="text-center text-sm text-ink-secondary">
              {vms.length === 0
                ? 'Your completed matches will appear here.'
                : `No ${filter.toLowerCase()} to show.`}
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Animated.View style={listStyle} className="flex-1">
        {body}
      </Animated.View>
      <Header
        count={count}
        filter={filter}
        onFilter={setFilter}
        titleIntro={titleIntro}
        filterIntro={filterIntro}
        dividerIntro={dividerIntro}
      />
    </View>
  );
};

export default History;
