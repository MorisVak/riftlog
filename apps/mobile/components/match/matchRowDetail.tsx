import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { splitCardName, type CardRef } from '@riftlog/core';
import { LegendPortrait } from '@/components/deck/cardArt';
import Icon from '@/components/icon';
import type { HistoryRowVM, Result } from '@/lib/historyView';

// The game letter's color — always with the letter itself.
const RESULT_TEXT: Record<Result, string> = {
  win: 'text-win-text',
  loss: 'text-loss-text',
  draw: 'text-draw-text',
};

/** A small legend portrait (face crop), or a silhouette when unknown. */
const Thumb = ({ legend }: { legend: CardRef | null }) => (
  <View className="relative h-10 w-8 items-center justify-center overflow-hidden rounded-md bg-elevated">
    {legend ? (
      <LegendPortrait card={legend} />
    ) : (
      <Icon name="user" size={13} className="text-ink-tertiary" />
    )}
  </View>
);

const championOf = (legend: CardRef | null): string =>
  legend ? splitCardName(legend.name).head : 'No legend';

/**
 * The expanded part of a History row — flat on purpose: no boxes, only the
 * information the row itself doesn't show. The matchup (your legend vs
 * theirs, you left), the games on one line, the clock for a timed match,
 * then the ways on: the decklist as played and the match detail. Built only
 * once a row has been opened (see `HistoryRow`).
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
  <View className="px-3 pb-1">
    <View className="h-px bg-border/60" />

    {/* The matchup, in the same order as every score: you – them. */}
    <View
      accessible
      accessibilityLabel={`${championOf(vm.yourLegend)} versus ${championOf(vm.opponentLegend)}`}
      className="flex-row items-center gap-2.5 pt-3"
    >
      <Thumb legend={vm.yourLegend} />
      <Text className="font-display text-[14px] text-ink-primary" numberOfLines={1}>
        {championOf(vm.yourLegend)}
      </Text>
      <Text className="font-display text-[11px] text-ink-tertiary">vs</Text>
      <Text className="flex-1 font-display text-[14px] text-ink-primary" numberOfLines={1}>
        {championOf(vm.opponentLegend)}
      </Text>
      <Thumb legend={vm.opponentLegend} />
    </View>

    {/* The games on one line: number, score (you – them), result letter. */}
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 pt-3">
      {vm.games.map((g) => (
        <View
          key={g.n}
          accessible
          accessibilityLabel={`Game ${g.n}: ${g.label}, ${g.result}`}
          className="flex-row items-baseline gap-1.5"
        >
          <Text className="text-[12px] text-ink-tertiary">G{g.n}</Text>
          <Text className="font-mono text-[14px] text-ink-primary">{g.label}</Text>
          <Text className={`font-display-bold text-[12px] ${RESULT_TEXT[g.result]}`}>
            {g.letter}
          </Text>
        </View>
      ))}
    </View>

    {/* Timed matches: the clock and what it took; "overtime" spelled out. */}
    {vm.timer && (
      <Text
        className={`pt-1.5 text-[12px] ${vm.timer.overtime ? 'text-loss-text' : 'text-ink-tertiary'}`}
      >
        {vm.timer.limit} round · played {vm.timer.played}
        {vm.timer.overtime ? ' (overtime)' : ''}
      </Text>
    )}

    {/* The ways on. The deck's name is already in the row, so just a link. */}
    <View className="mt-2 flex-row items-center justify-between">
      {vm.deck && !vm.deck.deleted ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open decklist ${vm.deck.name}`}
          disabled={disabled}
          onPress={onOpenDeck}
          hitSlop={6}
          className="h-11 flex-row items-center gap-1 active:opacity-60"
        >
          <Text className="font-display text-[14px] text-ink-secondary">
            {vm.deck.edited ? 'Decklist (as played)' : 'Decklist'}
          </Text>
          <Icon name="chevron-right" size={14} className="text-ink-secondary" />
        </Pressable>
      ) : (
        <View />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View details of the match vs ${vm.opponent}`}
        disabled={disabled}
        onPress={onOpenDetails}
        hitSlop={6}
        className="h-11 flex-row items-center gap-1 active:opacity-60"
      >
        <Text className="font-display text-[14px] text-accent">Details</Text>
        <Icon name="arrow-right" size={14} className="text-accent" />
      </Pressable>
    </View>
  </View>
);

export default MatchRowDetail;
