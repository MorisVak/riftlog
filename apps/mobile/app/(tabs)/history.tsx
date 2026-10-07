import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deleteMatch,
  deleteMatches,
  fetchMatchHistory,
  type MatchWithGames,
} from '@/lib/matchPersistence';
import { toHistoryRowVM, type HistoryRowVM } from '@/lib/historyView';
import HistoryRow from '@/components/historyRow';
import AuthGate from '@/components/authGate';
import { useAuth } from '@/contexts/authContext';
import { playIntro, useFade, useRise } from '@/hooks/useScreenIntro';
import { useSelection, type Selection } from '@/hooks/useSelection';
import SelectionBar from '@/components/selectionBar';

/**
 * History tab. Reads the signed-in user's matches (with their games) from
 * Postgres on focus — history is never mirrored locally (Slice 2, online path).
 * RLS scopes the result to the caller's own rows. The device owner is player
 * p1, so results read from p1's perspective.
 *
 * Account-gated: a guest gets this same screen, blurred, under a login card
 * (see AuthGate). The fetch is skipped while signed out — calling it would only
 * paint an RLS error behind the blur.
 */

const FILTERS = ['All', 'Wins', 'Losses', 'BO3'] as const;
type Filter = (typeof FILTERS)[number];

// Height of the floating header content (below the safe-area inset): the
// title/count row plus the filter-chip row.
const HEADER_H = 104;
const BACKGROUND = '#0D1B2A';

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
  selection,
  onDeleteSelected,
  titleIntro,
  filterIntro,
  dividerIntro,
}: {
  count: number | null;
  filter: Filter;
  onFilter: (f: Filter) => void;
  selection: Selection;
  onDeleteSelected: () => void;
  titleIntro: SharedValue<number>;
  filterIntro: SharedValue<number>;
  dividerIntro: SharedValue<number>;
}) => {
  const insets = useSafeAreaInsets();
  const titleStyle = useRise(titleIntro);
  const filterStyle = useRise(filterIntro);
  // The hairline divider fades in on its own step, after the title and filters
  // have settled. Opacity only (no rise) so the line doesn't slide.
  const lineStyle = useFade(dividerIntro);
  return (
    <View className="absolute inset-x-0 top-0 z-10">
      {/* The safe-area inset is padding *inside* the blur, not above it — with
          it on the wrapper the pane started below the notch and rows scrolled
          past the dynamic island unblurred. */}
      <BlurView tint="dark" intensity={48} style={{ paddingTop: insets.top }}>
        <View style={{ height: HEADER_H }} className="justify-end px-4 pb-3">
          {/* Both header states share one fixed slot and cross-fade, so the
              swap doesn't pop in a single frame while the rows slide. */}
          <Animated.View style={titleStyle} className="h-11 px-0.5">
            {selection.active ? (
              <Animated.View
                key="selecting"
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="absolute inset-x-0.5 top-0"
              >
                <SelectionBar
                  count={selection.count}
                  onCancel={selection.exit}
                  actions={[
                    {
                      key: 'delete',
                      icon: 'trash-2',
                      label: 'Delete selected matches',
                      onPress: onDeleteSelected,
                      destructive: true,
                    },
                  ]}
                />
              </Animated.View>
            ) : (
              <Animated.View
                key="title"
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                className="absolute inset-x-0.5 top-0 h-11 flex-row items-center justify-between"
              >
                <Text className="font-display-bold text-2xl text-ink-primary">
                  History
                </Text>
                {count !== null && count > 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[13px] text-ink-secondary">
                      {count} {count === 1 ? 'match' : 'matches'}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Select matches"
                      onPress={() => selection.start()}
                      className="h-11 justify-center pl-3"
                    >
                      <Text className="font-display text-[15px] text-accent">
                        Select
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </Animated.View>
            )}
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

/**
 * Placeholder rows shown to a guest, underneath the blur. Nothing here is real
 * data — it exists so the locked tab reads as "your history, locked" instead of
 * a blurred empty screen, which communicates nothing at all.
 */
const HistorySkeleton = ({ topPad }: { topPad: number }) => (
  <View
    className="flex-1 gap-2 px-4"
    style={{ paddingTop: topPad }}
    pointerEvents="none"
  >
    {[0, 1, 2, 3, 4].map((i) => (
      <View
        key={i}
        className="flex-row overflow-hidden rounded-xl border border-border bg-surface"
      >
        <View className="w-1 self-stretch bg-border" />
        <View className="min-h-[64px] flex-1 flex-row items-center gap-3 px-3 py-2">
          <View className="h-8 w-8 rounded-lg bg-elevated" />
          <View className="flex-1 gap-2">
            <View className="h-3 w-2/5 rounded-full bg-elevated" />
            <View className="h-2.5 w-1/4 rounded-full bg-elevated" />
          </View>
          <View className="h-4 w-10 rounded-full bg-elevated" />
        </View>
      </View>
    ))}
  </View>
);

const History = () => {
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const authed = status === 'authed';
  const [rows, setRows] = useState<MatchWithGames[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selection = useSelection();
  const { exit: exitSelection, clearSelected } = selection;

  // Entering selection mode collapses any expanded row.
  useEffect(() => {
    if (selection.active) setExpandedId(null);
  }, [selection.active]);

  // A filter change can hide selected rows; never act on rows you can't see.
  useEffect(() => {
    clearSelected();
  }, [filter, clearSelected]);

  // Arriving from a Home "Recent matches" row: open that match straight away.
  // The filter is reset too, otherwise an active chip (e.g. Wins) could hide
  // the very row we were asked to show. The param is cleared once applied, so
  // returning to this tab later doesn't re-expand it — and so tapping the same
  // match again from Home is a fresh param change that re-triggers this.
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  useEffect(() => {
    if (!matchId) return;
    setFilter('All');
    setExpandedId(matchId);
    router.setParams({ matchId: '' });
  }, [matchId]);

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
      playIntro([titleIntro, filterIntro, dividerIntro, listIntro]);
      // Signed out there is nothing to read — RLS would return an empty set at
      // best, and an error at worst, behind a blur nobody can act on.
      if (!authed) {
        return () => {
          active = false;
        };
      }
      fetchMatchHistory()
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message ?? 'Failed to load history'));
      return () => {
        active = false;
        // Leaving the tab ends selection mode.
        exitSelection();
      };
    }, [authed, titleIntro, filterIntro, dividerIntro, listIntro, exitSelection]),
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

  // Multi-select delete: confirm, drop the rows at once, delete them in one
  // statement; on failure put them all back.
  const deleteSelected = () => {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    const n = ids.length;
    Alert.alert(
      n === 1 ? 'Delete 1 match?' : `Delete ${n} matches?`,
      `This permanently deletes ${n === 1 ? 'the match' : 'these matches'} and ${n === 1 ? 'its' : 'their'} games. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const idSet = new Set(ids);
            let removed: MatchWithGames[] = [];
            setRows((cur) => {
              if (!cur) return cur;
              removed = cur.filter((m) => idSet.has(m.id));
              return cur.filter((m) => !idSet.has(m.id));
            });
            exitSelection();
            deleteMatches(ids).catch((e) => {
              setRows((cur) =>
                cur
                  ? [...cur, ...removed].sort((a, b) =>
                      b.ended_at.localeCompare(a.ended_at),
                    )
                  : cur,
              );
              Alert.alert('Could not delete', e?.message ?? 'Please try again.');
            });
          },
        },
      ],
    );
  };

  const topPad = insets.top + HEADER_H + 12;

  const loading = rows === null && error === null;
  const count = error === null && rows !== null ? vms.length : null;

  let body;
  if (!authed) {
    body = <HistorySkeleton topPad={topPad} />;
  } else if (loading) {
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
        // Rows read expansion + selection state that isn't in `data`.
        extraData={[expandedId, selection]}
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
            selecting={selection.active}
            selected={selection.isSelected(item.id)}
            onSelect={selection.toggle}
            onLongPress={selection.start}
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
        selection={selection}
        onDeleteSelected={deleteSelected}
        titleIntro={titleIntro}
        filterIntro={filterIntro}
        dividerIntro={dividerIntro}
      />
    </View>
  );
};

const HistoryTab = () => (
  <AuthGate>
    <History />
  </AuthGate>
);

export default HistoryTab;
