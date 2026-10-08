import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { deckDomains } from '@riftlog/core';
import type { Deck } from '@/lib/decks';
import { DomainChips } from '@/components/deck/domain';
import Icon from '@/components/icon';

/**
 * Home's "Recently played deck": the deck from your most recent match that had
 * one. Renders at once with the name from the match row; the legend and domain
 * chips fill in when the deck itself has loaded (`deck`), so nothing below it
 * jumps.
 */
const RecentDeckCard = ({
  name,
  playedAt,
  deck,
  onPress,
}: {
  /** The deck's current name, from the match row. */
  name: string;
  /** When that match ended (ISO). */
  playedAt: string;
  /** The full deck once fetched; null while loading. */
  deck: Deck | null;
  onPress: () => void;
}) => {
  const domains = deck ? deckDomains(deck.list) : null;
  const played = new Date(playedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Recently played deck: ${name}, played ${played}. Open deck`}
      onPress={onPress}
      className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5 active:bg-elevated"
    >
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
        <Icon name="layers" size={20} className="text-accent" />
      </View>
      <View className="flex-1">
        <Text
          className="font-display-bold text-[16px] text-ink-primary"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className="mt-0.5 text-[13px] text-ink-secondary"
          numberOfLines={1}
        >
          {deck?.list.legend?.name ?? ' '}
        </Text>
        {domains && (
          <View className="mt-2">
            <DomainChips domains={domains} />
          </View>
        )}
      </View>
      <View className="items-end gap-1.5">
        <Text className="font-mono-medium text-[11px] text-ink-tertiary">
          {played}
        </Text>
        <Icon name="chevron-right" size={18} className="text-ink-tertiary" />
      </View>
    </Pressable>
  );
};

export default RecentDeckCard;
