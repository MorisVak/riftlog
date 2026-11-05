import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { splitCardName, type CardRef } from '@riftlog/core';
import { CardBackdrop, LegendPortrait } from '@/components/deck/cardArt';
import Icon from '@/components/icon';
import type { HistoryRowVM, Result } from '@/lib/historyView';

// Result tokens for the game tiles — the letter always rides with the color.
const RESULT: Record<Result, { badge: string; text: string; bar: string }> = {
  win: { badge: 'bg-win-tint', text: 'text-win-text', bar: 'bg-win' },
  loss: { badge: 'bg-loss-tint', text: 'text-loss-text', bar: 'bg-loss' },
  draw: { badge: 'bg-draw-tint', text: 'text-draw-text', bar: 'bg-draw' },
};

/** A small legend portrait (face crop), or a silhouette when unknown. */
const Thumb = ({ legend }: { legend: CardRef | null }) => (
  <View className="relative h-14 w-11 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
    {legend ? (
      <LegendPortrait card={legend} />
    ) : (
      <Icon name="user" size={16} className="text-ink-tertiary" />
    )}
  </View>
);

/** One side of the matchup: portrait, name, and the legend's champion. */
const Side = ({
  name,
  legend,
  align,
}: {
  name: string;
  legend: CardRef | null;
  align: 'left' | 'right';
}) => {
  const champion = legend ? splitCardName(legend.name).head : null;
  const right = align === 'right';
  return (
    <View className={`flex-1 flex-row items-center gap-2.5 ${right ? 'flex-row-reverse' : ''}`}>
      <Thumb legend={legend} />
      <View className={`flex-1 ${right ? 'items-end' : ''}`}>
        <Text className="font-display text-[14px] text-ink-primary" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[12px] text-ink-secondary" numberOfLines={1}>
          {champion ?? 'No legend'}
        </Text>
      </View>
    </View>
  );
};

/**
 * The expanded part of a History row: the matchup (your legend vs theirs,
 * you left), one tile per game, the deck you played as a card with its
 * legend, the clock for a timed match, and the way to the match detail.
 * Built only once a row has been opened (see `HistoryRow`).
 */
const MatchRowDetail = ({
  vm,
  disabled,
  onOpenDeck,
  onOpenDetails,
}: {
  vm: HistoryRowVM;
  /** Selection mode: nothing in here is tappable. */
  disabled: boolean;
  onOpenDeck: () => void;
  onOpenDetails: () => void;
}) => (
  <View className="gap-2.5 px-3 pb-3 pt-1">
    {/* The matchup, in the same order as every score: you – them. */}
    <View className="flex-row items-center gap-2 rounded-xl bg-elevated px-3 py-2.5">
      <Side name={vm.you} legend={vm.yourLegend} align="left" />
      <View className="h-7 w-7 items-center justify-center rounded-full border border-border bg-background">
        <Text className="font-display-bold text-[10px] text-ink-secondary">VS</Text>
      </View>
      <Side name={vm.opponent} legend={vm.opponentLegend} align="right" />
    </View>

    {/* One tile per game: number, score (you – them), result letter. */}
    <View className="flex-row gap-2">
      {vm.games.map((g) => {
        const r = RESULT[g.result];
        return (
          <View
            key={g.n}
            accessible
            accessibilityLabel={`Game ${g.n}: ${g.label}, ${g.result}`}
            className="flex-1 flex-row items-center overflow-hidden rounded-xl bg-elevated"
          >
            <View className={`w-1 self-stretch ${r.bar}`} />
            <View className="flex-1 px-2.5 py-2">
              <Text className="text-[11px] text-ink-secondary">Game {g.n}</Text>
              <Text className="font-mono text-[16px] text-ink-primary">{g.label}</Text>
            </View>
            <View className={`mr-2.5 h-6 w-6 items-center justify-center rounded-md ${r.badge}`}>
              <Text className={`font-display-bold text-[11px] ${r.text}`}>{g.letter}</Text>
            </View>
          </View>
        );
      })}
    </View>

    {/* Timed matches: the clock and what it took; "overtime" spelled out. */}
    {vm.timer && (
      <View className="flex-row items-center gap-1.5 px-1">
        <Icon name="clock" size={12} className="text-ink-tertiary" />
        <Text
          className={`text-[12px] ${vm.timer.overtime ? 'text-loss-text' : 'text-ink-secondary'}`}
        >
          {vm.timer.limit} round · played {vm.timer.played}
          {vm.timer.overtime ? ' (overtime)' : ''}
        </Text>
      </View>
    )}

    {/* The deck you played, as a card with its legend; opens the list as
        played. Deleted since: named, not linked. */}
    {vm.deck && (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open deck ${vm.deck.name}`}
        disabled={disabled || vm.deck.deleted}
        onPress={onOpenDeck}
        className="relative min-h-[52px] flex-row items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface px-3 py-2 active:opacity-80"
      >
        {vm.yourLegend && <CardBackdrop card={vm.yourLegend} />}
        <View className="flex-1">
          <Text className="text-[11px] text-ink-secondary">
            {vm.deck.edited ? 'Deck · an earlier version' : 'Deck'}
          </Text>
          <Text className="font-display-bold text-[15px] text-ink-primary" numberOfLines={1}>
            {vm.deck.name}
            {vm.deck.deleted ? ' (deleted)' : ''}
          </Text>
        </View>
        {!vm.deck.deleted && <Icon name="chevron-right" size={16} className="text-ink-secondary" />}
      </Pressable>
    )}

    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View details of the match vs ${vm.opponent}`}
      disabled={disabled}
      onPress={onOpenDetails}
      className="h-11 flex-row items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 active:bg-accent/20"
    >
      <Text className="font-display text-[14px] text-accent">View details</Text>
      <Icon name="arrow-right" size={14} className="text-accent" />
    </Pressable>
  </View>
);

export default MatchRowDetail;
