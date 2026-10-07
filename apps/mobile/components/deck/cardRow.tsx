import React from 'react';
import { Text, View } from 'react-native';
import type { CardRef } from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';

type CardRowProps = {
  card: CardRef;
  /** A short label after the name, e.g. "Chosen" for the chosen champion. */
  tag?: string;
  /** Hairline above the row; off for the first row of a section. */
  divider?: boolean;
};

/**
 * One card in a decklist: count badge + name. Every deck surface renders cards
 * through this (and it through `CardArt`), so art arrives in one place.
 */
const CardRow = ({ card, tag, divider = true }: CardRowProps) => (
  <View
    accessible
    accessibilityLabel={`${card.count} ${card.name}${tag ? `, ${tag}` : ''}`}
    className={`flex-row items-center gap-3 py-2.5 ${divider ? 'border-t border-border/60' : ''}`}
  >
    <View className="h-6 min-w-[28px] items-center justify-center rounded-md bg-elevated px-1.5">
      <Text className="font-mono-medium text-[13px] text-ink-primary">
        {card.count}
      </Text>
    </View>
    <CardArt card={card} variant="thumb" />
    <Text className="flex-1 text-[15px] text-ink-primary" numberOfLines={2}>
      {card.name}
    </Text>
    {tag ? (
      <View className="rounded-full bg-accent/15 px-2 py-0.5">
        <Text className="font-display text-[11px] text-accent">{tag}</Text>
      </View>
    ) : null}
  </View>
);

export default CardRow;
