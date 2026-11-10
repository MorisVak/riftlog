import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { splitCardName, type CardRef } from '@riftlog/core';
import { LegendPortrait } from '@/components/deck/cardArt';
import Icon from '@/components/icon';
import {
  NO_FILTER,
  type FilterOptions,
  type HistoryFilter,
  type Period,
} from '@/lib/historyFilter';
import type { Result } from '@/lib/historyView';

/** A row of equal buttons, one chosen — as in match setup. */
const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T | null; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) => (
  <View className="flex-row gap-2">
    {options.map((o) => {
      const selected = o.value === value;
      return (
        <TouchableOpacity
          key={o.label}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => {
            if (selected) return;
            Haptics.selectionAsync();
            onChange(o.value);
          }}
          className={`h-11 flex-1 items-center justify-center rounded-xl border ${
            selected ? 'border-accent bg-accent' : 'border-border bg-surface'
          }`}
        >
          <Text
            className={`font-display text-[14px] ${selected ? 'text-background' : 'text-ink-secondary'}`}
            numberOfLines={1}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/** One choice among many (decks, legends): a pill; tap again to clear. */
const Choice = ({
  label,
  selected,
  onPress,
  legend,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Shows the legend's face in a small circle before the label. */
  legend?: CardRef;
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={() => {
      Haptics.selectionAsync();
      onPress();
    }}
    className={`h-10 flex-row items-center gap-2 rounded-full border ${legend ? 'pl-1 pr-3.5' : 'px-3.5'} ${
      selected ? 'border-accent bg-accent/20' : 'border-border bg-surface'
    }`}
  >
    {legend && (
      <View className="h-8 w-8 overflow-hidden rounded-full bg-elevated">
        <LegendPortrait card={legend} />
      </View>
    )}
    <Text
      className={`font-display text-[14px] ${selected ? 'text-ink-primary' : 'text-ink-secondary'}`}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mt-5">
    <Text className="mb-2 font-display text-base text-ink-secondary">{title}</Text>
    {children}
  </View>
);

/**
 * History's filters, in a sheet from the bottom: result, format, period,
 * then the decks and legends that appear in your matches (yours and theirs,
 * each with its face). Changes apply at once — the list behind updates and
 * the button counts what's left; it just closes the sheet. Reset clears all
 * but the search.
 */
const FilterSheet = ({
  visible,
  filter,
  onChange,
  options,
  resultCount,
  onClose,
}: {
  visible: boolean;
  filter: HistoryFilter;
  onChange: (f: HistoryFilter) => void;
  options: FilterOptions;
  /** Matches left with the current filter. */
  resultCount: number;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const set = <K extends keyof HistoryFilter>(key: K, value: HistoryFilter[K]) =>
    onChange({ ...filter, [key]: value });
  const toggle = <K extends 'deckId' | 'yourLegend' | 'opponentLegend'>(key: K, value: string) =>
    set(key, filter[key] === value ? null : value);

  return (
    // Translucent bars: on Android the modal then spans the whole screen, as
    // on iOS, so the height cap below (screen minus status bar) holds — it
    // started under the status bar and the sheet ran up behind the clock.
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        className="flex-1 justify-end bg-background/70"
      >
        <Pressable
          accessibilityLabel="Close filters"
          onPress={onClose}
          className="absolute inset-0"
        />
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={{ maxHeight: height - insets.top - 24, paddingBottom: insets.bottom + 12 }}
          className="rounded-t-3xl border border-b-0 border-border bg-elevated"
        >
          <View className="flex-row items-center justify-between px-5 pb-1 pt-4">
            <Text className="font-display-bold text-xl text-ink-primary">Filter matches</Text>
            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange({ ...NO_FILTER, query: filter.query });
                }}
                className="h-10 justify-center px-3"
              >
                <Text className="font-display text-[15px] text-accent">Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
              >
                <Icon name="x" size={16} className="text-ink-secondary" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
            <Section title="Result">
              <Segmented<Result>
                value={filter.result}
                onChange={(v) => set('result', v)}
                options={[
                  { value: null, label: 'All' },
                  { value: 'win', label: 'Wins' },
                  { value: 'loss', label: 'Losses' },
                  { value: 'draw', label: 'Draws' },
                ]}
              />
            </Section>
            <Section title="Format">
              <Segmented<'BO1' | 'BO3'>
                value={filter.format}
                onChange={(v) => set('format', v)}
                options={[
                  { value: null, label: 'All' },
                  { value: 'BO1', label: 'Best of 1' },
                  { value: 'BO3', label: 'Best of 3' },
                ]}
              />
            </Section>
            <Section title="Played">
              <Segmented<Period>
                value={filter.period}
                onChange={(v) => set('period', v)}
                options={[
                  { value: null, label: 'Any time' },
                  { value: '7d', label: '7 days' },
                  { value: '30d', label: '30 days' },
                  { value: '90d', label: '90 days' },
                ]}
              />
            </Section>

            {options.decks.length > 0 && (
              <Section title="Your deck">
                <View className="flex-row flex-wrap gap-2">
                  {options.decks.map((d) => (
                    <Choice
                      key={d.id}
                      label={d.name}
                      selected={filter.deckId === d.id}
                      onPress={() => toggle('deckId', d.id)}
                    />
                  ))}
                </View>
              </Section>
            )}
            {options.yourLegends.length > 0 && (
              <Section title="Your legend">
                <View className="flex-row flex-wrap gap-2">
                  {options.yourLegends.map((l) => (
                    <Choice
                      key={l.key}
                      label={splitCardName(l.card.name).head}
                      legend={l.card}
                      selected={filter.yourLegend === l.key}
                      onPress={() => toggle('yourLegend', l.key)}
                    />
                  ))}
                </View>
              </Section>
            )}
            {options.opponentLegends.length > 0 && (
              <Section title="Their legend">
                <View className="flex-row flex-wrap gap-2">
                  {options.opponentLegends.map((l) => (
                    <Choice
                      key={l.key}
                      label={splitCardName(l.card.name).head}
                      legend={l.card}
                      selected={filter.opponentLegend === l.key}
                      onPress={() => toggle('opponentLegend', l.key)}
                    />
                  ))}
                </View>
              </Section>
            )}
            <View className="h-5" />
          </ScrollView>

          <View className="border-t border-border/60 px-5 pt-3">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              className="h-12 items-center justify-center rounded-full bg-accent active:bg-accent-strong"
            >
              <Text className="font-display-bold text-base text-background">
                {resultCount === 0
                  ? 'No matches'
                  : `Show ${resultCount} ${resultCount === 1 ? 'match' : 'matches'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default FilterSheet;
