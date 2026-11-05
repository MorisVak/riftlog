import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  TextInput,
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
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deleteMatch,
  deleteMatches,
  type MatchListRow,
} from '@/lib/matchPersistence';
import { historyRowVM } from '@/lib/historyView';
import { matchHistoryCache, useMatchHistory } from '@/lib/sessionCache';
import {
  activeCount,
  applyFilter,
  filterOptions,
  NO_FILTER,
  PERIOD_DAYS,
  type HistoryFilter,
} from '@/lib/historyFilter';
import FilterSheet from '@/components/history/filterSheet';
import Icon from '@/components/icon';
import { splitCardName } from '@riftlog/core';
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

const BACKGROUND = '#0D1B2A';

/** A removable chip for one active filter. */
const ActiveChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={`Remove filter ${label}`}
    onPress={onRemove}
    className="h-8 flex-row items-center gap-1.5 rounded-full border border-accent/50 bg-accent/15 pl-3 pr-2"
  >
    <Text className="font-display text-[13px] text-ink-primary" numberOfLines={1}>
      {label}
    </Text>
    <Icon name="x" size={13} className="text-ink-secondary" />
  </TouchableOpacity>
);

const RESULT_LABEL = { win: 'Wins', loss: 'Losses', draw: 'Draws' } as const;

/** The active filters as chips, each with what removing it resets. */
const activeChips = (
  f: HistoryFilter,
  names: { deck: (id: string) => string; legend: (key: string) => string },
): { key: string; label: string; clear: Partial<HistoryFilter> }[] => {
  const chips: { key: string; label: string; clear: Partial<HistoryFilter> }[] = [];
  if (f.result)
    chips.push({ key: 'result', label: RESULT_LABEL[f.result], clear: { result: null } });
  if (f.format)
    chips.push({
      key: 'format',
      label: f.format === 'BO1' ? 'Best of 1' : 'Best of 3',
      clear: { format: null },
    });
  if (f.period)
    chips.push({
      key: 'period',
      label: `Last ${PERIOD_DAYS[f.period]} days`,
      clear: { period: null },
    });
  if (f.deckId) chips.push({ key: 'deck', label: names.deck(f.deckId), clear: { deckId: null } });
  if (f.yourLegend)
    chips.push({
      key: 'you',
      label: `You: ${names.legend(f.yourLegend)}`,
      clear: { yourLegend: null },
    });
  if (f.opponentLegend)
    chips.push({
      key: 'them',
      label: `vs ${names.legend(f.opponentLegend)}`,
      clear: { opponentLegend: null },
    });
  return chips;
};

const Header = ({
  total,
  shown,
  filter,
  onFilter,
  onOpenFilters,
  chips,
  selection,
  onDeleteSelected,
  onHeight,
  titleIntro,
  filterIntro,
  dividerIntro,
}: {
  /** All your matches; null while loading. */
  total: number | null;
  /** Matches left after filtering. */
  shown: number;
  filter: HistoryFilter;
  onFilter: (f: HistoryFilter) => void;
  onOpenFilters: () => void;
  chips: { key: string; label: string; clear: Partial<HistoryFilter> }[];
  selection: Selection;
  onDeleteSelected: () => void;
  /** The header's height, so the list starts below it (chips come and go). */
  onHeight: (h: number) => void;
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
  const badge = activeCount(filter);
  const filtered = badge > 0 || filter.query.trim() !== '';
  return (
    <View
      className="absolute inset-x-0 top-0 z-10"
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      {/* The safe-area inset is padding *inside* the blur, not above it — with
          it on the wrapper the pane started below the notch and rows scrolled
          past the dynamic island unblurred. */}
      <BlurView tint="dark" intensity={48} style={{ paddingTop: insets.top + 14 }}>
        <View className="px-4 pb-3">
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
                <Text className="font-display-bold text-2xl text-ink-primary">History</Text>
                {total !== null && total > 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[13px] text-ink-secondary">
                      {filtered
                        ? `${shown} of ${total}`
                        : `${total} ${total === 1 ? 'match' : 'matches'}`}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Select matches"
                      onPress={() => selection.start()}
                      className="h-11 justify-center pl-3"
                    >
                      <Text className="font-display text-[15px] text-accent">Select</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </Animated.View>
            )}
          </Animated.View>

          {/* Search, and the Filter button with how many filters are on. */}
          <Animated.View style={filterStyle} className="mt-3 flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
              <Icon name="search" size={16} className="text-ink-tertiary" />
              <TextInput
                value={filter.query}
                onChangeText={(query) => onFilter({ ...filter, query })}
                placeholder="Opponent, deck or legend"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel="Search matches"
                className="h-11 flex-1 text-[16px] text-ink-primary placeholder:text-ink-tertiary"
              />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={badge > 0 ? `Filters, ${badge} on` : 'Filters'}
              onPress={onOpenFilters}
              className={`h-11 flex-row items-center gap-1.5 rounded-xl border px-3 ${
                badge > 0 ? 'border-accent bg-accent/15' : 'border-border bg-surface'
              }`}
            >
              <Icon
                name="sliders"
                size={15}
                className={badge > 0 ? 'text-accent' : 'text-ink-secondary'}
              />
              <Text
                className={`font-display text-[14px] ${badge > 0 ? 'text-accent' : 'text-ink-secondary'}`}
              >
                Filter
              </Text>
              {badge > 0 && (
                <View className="min-w-[18px] items-center rounded-full bg-accent px-1">
                  <Text className="font-display-bold text-[11px] text-background">{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* What's filtered, at a glance — tap a chip to drop it. */}
          {chips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4 mt-2.5"
              contentContainerClassName="gap-2 px-4"
            >
              {chips.map((c) => (
                <ActiveChip
                  key={c.key}
                  label={c.label}
                  onRemove={() => onFilter({ ...filter, ...c.clear })}
                />
              ))}
              {chips.length > 1 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => onFilter({ ...NO_FILTER, query: filter.query })}
                  className="h-8 justify-center px-2"
                >
                  <Text className="font-display text-[13px] text-accent">Clear all</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
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
  <View className="flex-1 gap-2 px-4" style={{ paddingTop: topPad }} pointerEvents="none">
    {[0, 1, 2, 3, 4].map((i) => (
      <View key={i} className="flex-row overflow-hidden rounded-xl border border-border bg-surface">
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
  // Your matches, kept in memory for the session: shown at once, refreshed
  // quietly on focus (lib/sessionCache.ts).
  const { data: rows, error } = useMatchHistory();
  // Module-level, so stable: deletes change the cached list in place.
  const setRows = matchHistoryCache.update;
  const [filter, setFilter] = useState<HistoryFilter>(NO_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The floating header's height (it grows with the filter chips); a first
  // guess until it has been measured.
  const [headerH, setHeaderH] = useState(insets.top + 128);
  const selection = useSelection();
  const { exit: exitSelection, clearSelected } = selection;

  // A filter change can hide selected rows; never act on rows you can't see.
  useEffect(() => {
    clearSelected();
  }, [filter, clearSelected]);

  const titleIntro = useSharedValue(0);
  const filterIntro = useSharedValue(0);
  const dividerIntro = useSharedValue(0);
  const listIntro = useSharedValue(0);
  const listStyle = useRise(listIntro);

  useFocusEffect(
    useCallback(() => {
      // Replay the intro on each focus, staggering the elements top-to-bottom
      // (title → filters → matches) so the screen assembles dynamically rather
      // than fading in all at once (design `.scr` / scrIn).
      playIntro([titleIntro, filterIntro, dividerIntro, listIntro]);
      // Signed out there is nothing to read — RLS would return an empty set at
      // best, and an error at worst, behind a blur nobody can act on.
      if (!authed) return;
      void matchHistoryCache.refresh();
      // Leaving the tab ends selection mode.
      return () => exitSelection();
    }, [authed, titleIntro, filterIntro, dividerIntro, listIntro, exitSelection]),
  );

  const vms = useMemo(() => (rows ?? []).map(historyRowVM), [rows]);
  const visible = useMemo(() => applyFilter(vms, filter), [vms, filter]);
  const options = useMemo(() => filterOptions(vms), [vms]);
  const chips = useMemo(
    () =>
      activeChips(filter, {
        deck: (id) => options.decks.find((d) => d.id === id)?.name ?? 'Deck',
        legend: (key) => {
          const l =
            options.yourLegends.find((o) => o.key === key) ??
            options.opponentLegends.find((o) => o.key === key);
          return l ? splitCardName(l.card.name).head : 'Legend';
        },
      }),
    [filter, options],
  );

  const openMatch = useCallback((id: string) => router.push(`/matches/${id}`), []);

  // Optimistically drop the row, then delete from Postgres (cascade removes its
  // games). On failure, restore the row so the list stays truthful.
  const handleDelete = useCallback((id: string) => {
    let removed: MatchListRow | undefined;
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
  }, [setRows]);

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
            let removed: MatchListRow[] = [];
            setRows((cur) => {
              if (!cur) return cur;
              removed = cur.filter((m) => idSet.has(m.id));
              return cur.filter((m) => !idSet.has(m.id));
            });
            exitSelection();
            deleteMatches(ids).catch((e) => {
              setRows((cur) =>
                cur
                  ? [...cur, ...removed].sort((a, b) => b.ended_at.localeCompare(a.ended_at))
                  : cur,
              );
              Alert.alert('Could not delete', e?.message ?? 'Please try again.');
            });
          },
        },
      ],
    );
  };

  const topPad = headerH + 4;

  const loading = rows === null && error === null;
  const total = error === null && rows !== null ? vms.length : null;

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
      <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: topPad }}>
        <Text className="text-center text-sm text-loss-text">{error}</Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={visible}
        // Rows read selection state that isn't in `data`.
        extraData={selection}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        // Every row is built up front (all matches are already fetched in
        // one read), so scrolling never waits on new rows being made. The
        // window stays large but finite, so a very long history still lets
        // far-off rows go.
        initialNumToRender={Math.max(visible.length, 10)}
        maxToRenderPerBatch={50}
        windowSize={41}
        renderItem={({ item }) => (
          <HistoryRow
            vm={item}
            onOpen={openMatch}
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
                : 'No matches fit these filters.'}
            </Text>
            {vms.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setFilter(NO_FILTER)}
                className="mt-2 px-3 py-2"
              >
                <Text className="font-display text-[14px] text-accent">Clear filters</Text>
              </TouchableOpacity>
            )}
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
        total={total}
        shown={visible.length}
        filter={filter}
        onFilter={setFilter}
        onOpenFilters={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setFiltersOpen(true);
        }}
        chips={chips}
        selection={selection}
        onDeleteSelected={deleteSelected}
        onHeight={setHeaderH}
        titleIntro={titleIntro}
        filterIntro={filterIntro}
        dividerIntro={dividerIntro}
      />
      <FilterSheet
        visible={filtersOpen}
        filter={filter}
        onChange={setFilter}
        options={options}
        resultCount={visible.length}
        onClose={() => setFiltersOpen(false)}
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
