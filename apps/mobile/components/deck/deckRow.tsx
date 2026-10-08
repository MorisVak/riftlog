import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { deckDomains } from '@riftlog/core';
import type { Deck } from '@/lib/decks';
import { DomainChips } from '@/components/deck/domain';
import Icon from '@/components/icon';
import SwipeToDelete from '@/components/swipeToDelete';
import { SelectionGutter } from '@/components/selectCheck';

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
 * delete, same as a match-history row. In selection mode a tap toggles the
 * row and swiping is off; a long-press starts selection with this row.
 */
const DeckRow = ({
  deck,
  onPress,
  onDelete,
  selecting = false,
  selected = false,
  onSelect,
  onLongPress,
}: {
  deck: Deck;
  onPress: () => void;
  onDelete: () => void;
  selecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onLongPress?: () => void;
}) => {
  const domains = deckDomains(deck.list);
  const updated = formatUpdated(deck.updatedAt);

  return (
    // In selection mode the check sits OUTSIDE the card, to its left (as in a
    // WhatsApp chat); the gutter slides open and pushes the card right.
    <View className="flex-row items-center">
      <SelectionGutter
        selecting={selecting}
        selected={selected}
        onToggle={onSelect}
      />
      <View className="flex-1">
        <SwipeToDelete
          accessibilityLabel={`Delete deck ${deck.name}`}
          confirmTitle="Delete deck?"
          confirmMessage={`"${deck.name}" will be removed from your decks. This can't be undone.`}
          onDelete={onDelete}
          enabled={!selecting}
          className={`rounded-2xl border bg-surface ${
            selected ? 'border-accent' : 'border-border'
          }`}
        >
          {({ isOpen, close }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${deck.name}${deck.list.legend ? `, ${deck.list.legend.name}` : ''}, updated ${updated}`}
              accessibilityState={selecting ? { selected } : undefined}
              // Selecting: toggle. Otherwise a tap on an open row closes it
              // instead of opening the deck.
              onPress={() => {
                if (selecting) {
                  Haptics.selectionAsync();
                  onSelect?.();
                } else if (isOpen) close();
                else onPress();
              }}
              // Always set, even while selecting: if this prop disappears
              // mid-press (the long-press itself enters selection mode), the
              // release is treated as a tap and instantly deselects the row.
              onLongPress={() => {
                if (selecting) {
                  Haptics.selectionAsync();
                  onSelect?.();
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onLongPress?.();
              }}
              delayLongPress={350}
              // Opaque on purpose: the red action sits behind this card.
              className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-elevated ${
                selected ? 'bg-elevated' : 'bg-surface'
              }`}
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
              {!selecting && (
                <Icon
                  name="chevron-right"
                  size={18}
                  className="text-ink-tertiary"
                />
              )}
            </Pressable>
          )}
        </SwipeToDelete>
      </View>
    </View>
  );
};

export default DeckRow;
