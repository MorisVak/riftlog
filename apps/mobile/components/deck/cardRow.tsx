import React from 'react';
import { Text, View } from 'react-native';
import type { CardRef } from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';

/** How this card's count moved from the version before (Show changes). */
export type CardChange = { before: number; after: number };

type CardRowProps = {
  card: CardRef;
  /** A short label after the name, e.g. "Chosen" for the chosen champion. */
  tag?: string;
  /** Hairline above the row; off for the first row of a section. */
  divider?: boolean;
  /**
   * Set in "Show changes" mode when the count differs from the previous
   * version: green for added / increased, red for cut / reduced. A removed
   * card is passed with its old count and `after: 0`, and is struck through.
   */
  change?: CardChange;
};

/** "+2" / "−1" / "New" / "Removed" — the change in words, never color alone. */
const changeLabel = ({ before, after }: CardChange): string =>
  before === 0
    ? 'New'
    : after === 0
      ? 'Removed'
      : after > before
        ? `+${after - before}`
        : `−${before - after}`;

/**
 * One card in a decklist: count badge + name. Every deck surface renders cards
 * through this (and it through `CardArt`), so art arrives in one place.
 */
const CardRow = ({ card, tag, divider = true, change }: CardRowProps) => {
  const up = change !== undefined && change.after > change.before;
  const removed = change !== undefined && change.after === 0;
  return (
    <View
      accessible
      accessibilityLabel={`${card.count} ${card.name}${tag ? `, ${tag}` : ''}${
        change
          ? removed
            ? `, removed (was ${change.before})`
            : `, ${changeLabel(change).replace('−', 'minus ')}`
          : ''
      }`}
      // A changed row is an inset pill in its change color — rounded and
      // inside the section's padding, so it never meets the card's own rounded
      // edges; it drops the hairline (the pill separates itself).
      className={`flex-row items-center gap-3 py-2.5 ${
        change
          ? `-mx-2 my-0.5 rounded-lg px-2 ${up ? 'bg-added-tint' : 'bg-cut-tint'}`
          : divider
            ? 'border-t border-border/60'
            : ''
      }`}
    >
      <View
        className={`h-6 min-w-[28px] items-center justify-center rounded-md px-1.5 ${
          change ? 'bg-background/50' : 'bg-elevated'
        }`}
      >
        <Text
          className={`font-mono-medium text-[13px] ${
            change ? (up ? 'text-added' : 'text-cut') : 'text-ink-primary'
          } ${removed ? 'line-through' : ''}`}
        >
          {card.count}
        </Text>
      </View>
      <CardArt card={card} variant="thumb" />
      <Text
        className={`flex-1 text-[15px] ${
          removed ? 'text-ink-secondary line-through' : 'text-ink-primary'
        }`}
        numberOfLines={2}
      >
        {card.name}
      </Text>
      {tag ? (
        <View className="rounded-full bg-accent/15 px-2 py-0.5">
          <Text className="font-display text-[11px] text-accent">{tag}</Text>
        </View>
      ) : null}
      {change ? (
        <Text
          className={`font-mono-medium text-[12px] ${up ? 'text-added' : 'text-cut'}`}
        >
          {changeLabel(change)}
        </Text>
      ) : null}
    </View>
  );
};

export default CardRow;
