import React from 'react';
import { Text, View } from 'react-native';
import type { DeckCheck, DeckList } from '@riftlog/core';
import Icon from '@/components/icon';
import RiotDisclaimer from '@/components/riotDisclaimer';
import { useDeckCheck } from '@/hooks/useDeckCheck';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 cards not in the card catalog · 1 card in the wrong section", or null. */
export const deckCheckSummary = (check: DeckCheck): string | null => {
  const parts = [
    check.unknown > 0 ? `${plural(check.unknown, 'card', 'cards')} not in the card catalog` : null,
    check.conflicts > 0 ? `${plural(check.conflicts, 'card', 'cards')} whose code is a different card` : null,
    check.misplaced > 0 ? `${plural(check.misplaced, 'card', 'cards')} in the wrong section` : null,
  ].filter((p): p is string => p !== null);
  return parts.length ? parts.join(' · ') : null;
};

/**
 * Under a decklist: what the catalog check found (flagged cards are marked
 * where they sit), and the Riot disclaimer whenever card art is on screen.
 */
const DeckCheckNote = ({ list }: { list: DeckList }) => {
  const { check, showsArt } = useDeckCheck(list);
  const summary = check ? deckCheckSummary(check) : null;
  if (!summary && !showsArt) return null;
  return (
    <View className="mt-4 gap-3 px-1">
      {summary && (
        <View className="flex-row items-start gap-2" accessible accessibilityLabel={`Check this deck: ${summary}`}>
          <Icon name="alert-triangle" size={13} className="mt-0.5 text-ink-primary" />
          <Text className="flex-1 text-[13px] leading-5 text-ink-primary">{summary}</Text>
        </View>
      )}
      {showsArt && <RiotDisclaimer />}
    </View>
  );
};

export default DeckCheckNote;
