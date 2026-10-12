import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { deckDomains } from '@riftlog/core';
import { fetchMyDecks, type Deck } from '@/lib/decks';
import { DomainChips } from '@/components/deck/domain';
import Icon from '@/components/icon';

// The legend menu floats over the list; a style object, not a shadow class
// (see the shadow note in apps/mobile/CLAUDE.md). Mirrors `background`.
const MENU_SHADOW = {
  shadowColor: '#0D1B2A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.6,
  shadowRadius: 16,
} as const;

/** "Kennen, Heart of the Tempest" → "Kennen": fits the small filter button. */
const shortLegend = (name: string): string => name.split(',')[0]?.trim() || name;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; decks: Deck[] }
  | { kind: 'error' };

/**
 * Pick one of your saved decks (or none): a field showing the current choice
 * that opens a full-height sheet listing every deck — name, legend, domains —
 * in large, easy-to-tell-apart rows. Used for "Your deck" in the match setup
 * and "Default deck" on Profile. Signed-in only (callers hide it for guests).
 *
 * The sheet has a search field (deck name or legend) and, once you have
 * decks with more than one legend, a small "Legend" dropdown beside it to
 * filter by. Both reset each time the sheet opens. "No deck" always stays at the top.
 *
 * `defaultDeckId` tags that deck "Default" in the list. With `preselect`, the
 * picker also chooses it once the decks load — unless the user has already
 * picked something — which is how the setup sheet starts on your default.
 */
const DeckPicker = ({
  value,
  onChange,
  noneLabel = 'No deck',
  title = 'Choose your deck',
  defaultDeckId = null,
  preselect = false,
}: {
  value: Deck | null;
  onChange: (deck: Deck | null) => void;
  /** The "nothing chosen" option, e.g. "No default deck". */
  noneLabel?: string;
  /** The sheet's title. */
  title?: string;
  defaultDeckId?: string | null;
  preselect?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  // Once the user has picked, a late-arriving default must not override it.
  const touched = useRef(false);
  const [query, setQuery] = useState('');
  // Legend filter, by exact legend name; null = all legends.
  const [legend, setLegend] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const decks = useMemo(
    () => (state.kind === 'ready' ? state.decks : []),
    [state],
  );
  // The legends among your decks, in first-seen (most recently updated) order.
  const legends = useMemo(() => {
    const seen = new Set<string>();
    for (const d of decks) {
      const name = d.list.legend?.name;
      if (name) seen.add(name);
    }
    return [...seen];
  }, [decks]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decks.filter(
      (d) =>
        (legend === null || d.list.legend?.name === legend) &&
        (q === '' ||
          d.name.toLowerCase().includes(q) ||
          (d.list.legend?.name.toLowerCase().includes(q) ?? false)),
    );
  }, [decks, query, legend]);
  const filtering = query.trim() !== '' || legend !== null;

  // Loaded on mount (to resolve the field and the preselect) and again each
  // time the sheet opens, so a deck imported or deleted meanwhile shows up.
  // A failed re-read keeps the list already loaded.
  useEffect(() => {
    let active = true;
    fetchMyDecks()
      .then((decks) => active && setState({ kind: 'ready', decks }))
      .catch(
        () => active && setState((cur) => (cur.kind === 'ready' ? cur : { kind: 'error' })),
      );
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!preselect || touched.current || state.kind !== 'ready') return;
    if (value !== null || defaultDeckId === null) return;
    const deck = state.decks.find((d) => d.id === defaultDeckId);
    if (deck) onChange(deck);
    // Runs when the decks (or the default) arrive, not on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, defaultDeckId, preselect]);

  const choose = (deck: Deck | null) => {
    Haptics.selectionAsync();
    touched.current = true;
    onChange(deck);
    setOpen(false);
  };

  const openSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    setLegend(null);
    setMenuOpen(false);
    setOpen(true);
  };

  const pickLegend = (name: string | null) => {
    Haptics.selectionAsync();
    setLegend(name);
    setMenuOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value ? value.name : noneLabel}`}
        onPress={openSheet}
        className="min-h-[52px] flex-row items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-3 active:bg-surface"
      >
        <View className="flex-1">
          <Text
            className={`text-base ${value ? 'font-display text-ink-primary' : 'text-ink-secondary'}`}
            numberOfLines={1}
          >
            {value ? value.name : noneLabel}
          </Text>
          {value?.list.legend && (
            <Text className="mt-0.5 text-[13px] text-ink-secondary" numberOfLines={1}>
              {value.list.legend.name}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={18} className="text-ink-secondary" />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              className="h-11 min-w-[72px] justify-center"
            >
              <Text className="font-display text-[16px] text-ink-secondary">
                Cancel
              </Text>
            </TouchableOpacity>
            <Text className="font-display-bold text-[16px] text-ink-primary">
              {title}
            </Text>
            <View className="min-w-[72px]" />
          </View>

          {decks.length > 0 && (
            // z-20 so the legend menu drops over the list below.
            <View className="z-20 flex-row items-center gap-2 border-b border-border/60 px-4 py-3">
              <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-elevated px-3">
                <Icon name="search" size={16} className="text-ink-tertiary" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search decks or legends"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  accessibilityLabel="Search decks"
                  className="h-11 flex-1 text-[16px] text-ink-primary placeholder:text-ink-tertiary"
                />
              </View>
              {legends.length > 1 && (
                <View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by legend: ${legend ?? 'all legends'}`}
                    accessibilityState={{ expanded: menuOpen }}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMenuOpen((o) => !o);
                    }}
                    className={`h-11 max-w-[128px] flex-row items-center gap-1.5 rounded-xl border px-3 ${
                      legend !== null || menuOpen
                        ? 'border-accent bg-accent/15'
                        : 'border-border bg-elevated'
                    }`}
                  >
                    <Icon
                      name="filter"
                      size={15}
                      className={legend !== null ? 'text-accent' : 'text-ink-secondary'}
                    />
                    <Text
                      className={`flex-shrink font-display text-[14px] ${
                        legend !== null ? 'text-accent' : 'text-ink-secondary'
                      }`}
                      numberOfLines={1}
                    >
                      {legend !== null ? shortLegend(legend) : 'Legend'}
                    </Text>
                    <Icon
                      name={menuOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      className={legend !== null ? 'text-accent' : 'text-ink-secondary'}
                    />
                  </TouchableOpacity>

                  {menuOpen && (
                    <Animated.View
                      entering={FadeIn.duration(120)}
                      exiting={FadeOut.duration(100)}
                      style={MENU_SHADOW}
                      className="absolute right-0 top-[52px] w-72 overflow-hidden rounded-xl border border-border bg-elevated"
                    >
                      {[null, ...legends].map((name, i) => (
                        <Pressable
                          key={name ?? 'all'}
                          accessibilityRole="button"
                          accessibilityState={{ selected: legend === name }}
                          onPress={() => pickLegend(name)}
                          className={`min-h-[44px] flex-row items-center gap-2 px-3.5 py-2.5 active:bg-surface ${
                            i > 0 ? 'border-t border-border/60' : ''
                          }`}
                        >
                          <Text
                            className={`flex-1 text-[15px] ${
                              name === null ? 'text-ink-secondary' : 'text-ink-primary'
                            }`}
                            numberOfLines={2}
                          >
                            {name ?? 'All legends'}
                          </Text>
                          {legend === name && (
                            <Icon name="check" size={16} className="text-accent" />
                          )}
                        </Pressable>
                      ))}
                    </Animated.View>
                  )}
                </View>
              )}
            </View>
          )}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 24,
              gap: 10,
            }}
          >
            <NoneRow
              label={noneLabel}
              selected={value === null}
              onPress={() => choose(null)}
            />
            {state.kind === 'loading' ? (
              <Text className="px-1 py-4 text-sm text-ink-tertiary">
                Loading your decks…
              </Text>
            ) : state.kind === 'error' ? (
              <Text className="px-1 py-4 text-sm text-ink-secondary">
                {"Couldn't load your decks. Check your connection and try again."}
              </Text>
            ) : state.decks.length === 0 ? (
              <Text className="px-1 py-4 text-[14px] leading-5 text-ink-secondary">
                No decks yet — import one from your Profile.
              </Text>
            ) : shown.length === 0 ? (
              <View className="items-center px-1 py-6">
                <Text className="text-center text-[14px] text-ink-secondary">
                  No decks match{filtering ? ' these filters' : ''}.
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setQuery('');
                    setLegend(null);
                  }}
                  className="mt-2 px-3 py-2"
                >
                  <Text className="font-display text-[14px] text-accent">
                    Clear filters
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              shown.map((deck) => (
                <DeckOption
                  key={deck.id}
                  deck={deck}
                  isDefault={deck.id === defaultDeckId}
                  selected={value?.id === deck.id}
                  onPress={() => choose(deck)}
                />
              ))
            )}
          </ScrollView>

          {/* Tap anywhere else to close the legend menu. */}
          {menuOpen && (
            <Pressable
              accessibilityLabel="Close legend filter"
              onPress={() => setMenuOpen(false)}
              className="absolute inset-0 z-10"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

/** The "no deck" choice, styled as a quieter row than the decks. */
const NoneRow = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    className={`min-h-[56px] flex-row items-center rounded-2xl border px-4 py-3 active:bg-elevated ${
      selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
    }`}
  >
    <Text className="flex-1 text-[16px] text-ink-secondary">{label}</Text>
    {selected && <Icon name="check" size={20} className="text-accent" />}
  </Pressable>
);

/** One deck: name, legend, domain chips — big enough to tell decks apart. */
const DeckOption = ({
  deck,
  isDefault,
  selected,
  onPress,
}: {
  deck: Deck;
  isDefault: boolean;
  selected: boolean;
  onPress: () => void;
}) => {
  const domains = deckDomains(deck.list);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${deck.name}${deck.list.legend ? `, ${deck.list.legend.name}` : ''}${isDefault ? ', default deck' : ''}`}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border px-4 py-4 active:bg-elevated ${
        selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
      }`}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-shrink font-display-bold text-[17px] text-ink-primary"
            numberOfLines={1}
          >
            {deck.name}
          </Text>
          {isDefault && (
            <View className="rounded-full bg-accent/15 px-2 py-0.5">
              <Text className="font-display text-[11px] text-accent">Default</Text>
            </View>
          )}
        </View>
        {deck.list.legend && (
          <Text className="mt-1 text-[14px] text-ink-secondary" numberOfLines={1}>
            {deck.list.legend.name}
          </Text>
        )}
        {domains && (
          <View className="mt-2">
            <DomainChips domains={domains} />
          </View>
        )}
      </View>
      {selected ? (
        <Icon name="check" size={20} className="text-accent" />
      ) : (
        <View className="h-5 w-5" />
      )}
    </Pressable>
  );
};

export default DeckPicker;
