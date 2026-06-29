import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMatchHistory, type MatchWithGames } from '@/lib/matchPersistence';
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
}: {
  count: number | null;
  filter: Filter;
  onFilter: (f: Filter) => void;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-x-0 top-0 z-10"
      style={{ paddingTop: insets.top }}
    >
      <BlurView tint="dark" intensity={48} className="border-b border-border">
        <View style={{ height: HEADER_H }} className="justify-end px-4 pb-3">
          <View className="flex-row items-baseline justify-between px-0.5">
            <Text className="font-display-bold text-2xl text-ink-primary">
              History
            </Text>
            {count !== null ? (
              <Text className="text-[13px] text-ink-secondary">
                {count} {count === 1 ? 'match' : 'matches'}
              </Text>
            ) : null}
          </View>
          <View className="mt-3 flex-row gap-2">
            {FILTERS.map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={filter === f}
                onPress={() => onFilter(f)}
              />
            ))}
          </View>
        </View>
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

  const intro = useSharedValue(0);
  const introStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [{ translateY: (1 - intro.value) * 10 }],
  }));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      // Replay the screen intro on each focus (design `.scr` / scrIn).
      intro.value = 0;
      intro.value = withTiming(1, { duration: 340, easing: SCREEN_EASING });
      fetchMatchHistory()
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message ?? 'Failed to load history'));
      return () => {
        active = false;
      };
    }, [intro]),
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
      <Animated.View style={introStyle} className="flex-1">
        {body}
        <Header count={count} filter={filter} onFilter={setFilter} />
      </Animated.View>
    </View>
  );
};

export default History;
