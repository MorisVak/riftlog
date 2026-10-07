import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { deckDomains } from '@riftlog/core';
import type { Deck } from '@/lib/decks';
import { DomainChips } from '@/components/deck/domain';
import Icon from '@/components/icon';
import SwipeToDelete from '@/components/swipeToDelete';

/** "Sep 24"; the year is added only when it isn't this year. */
const formatUpdated = (iso: string): string => {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

/**
 * One saved deck in a list: name, legend, domains, last updated. Swipe left to
 * delete, same as a match-history row.
 */
const DeckRow = ({
  deck,
  onPress,
  onDelete,
}: {
  deck: Deck;
  onPress: () => void;
  onDelete: () => void;
}) => {
  const domains = deckDomains(deck.list);
  const updated = formatUpdated(deck.updatedAt);

  return (
    <SwipeToDelete
      accessibilityLabel={`Delete deck ${deck.name}`}
      confirmTitle="Delete deck?"
      confirmMessage={`"${deck.name}" will be removed from your decks. This can't be undone.`}
      onDelete={onDelete}
      className="rounded-2xl border border-border bg-surface"
    >
      {({ isOpen, close }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${deck.name}${deck.list.legend ? `, ${deck.list.legend.name}` : ''}, updated ${updated}`}
          // Tapping an open row closes it instead of opening the deck.
          onPress={isOpen ? close : onPress}
          // Opaque on purpose: the red action sits behind this card.
          className="flex-row items-center gap-3 bg-surface px-4 py-3.5 active:bg-elevated"
        >
          <View className="flex-1">
            <View className="flex-row items-baseline justify-between gap-2">
              <Text
                className="flex-1 font-display-bold text-[15px] text-ink-primary"
                numberOfLines={1}
              >
                {deck.name}
              </Text>
              <Text className="font-mono-medium text-[11px] text-ink-tertiary">
                {updated}
              </Text>
            </View>
            <Text
              className="mt-0.5 text-[13px] text-ink-secondary"
              numberOfLines={1}
            >
              {deck.list.legend?.name ?? 'No legend'}
            </Text>
            {domains && (
              <View className="mt-2">
                <DomainChips domains={domains} />
              </View>
            )}
          </View>
          <Icon name="chevron-right" size={18} className="text-ink-tertiary" />
        </Pressable>
      )}
    </SwipeToDelete>
  );
};

export default DeckRow;
