import React from 'react';
import { Text } from 'react-native';
import { deckCardKey, type CardRef, type DeckCardChange } from '@riftlog/core';
import CardRow from '@/components/deck/cardRow';

/**
 * A section's cards as rows, or "None". `firstDivider` draws a hairline above
 * the first row when something (the chosen champion) sits above the list.
 *
 * With `changes` (Show changes mode — this section's entries from
 * `diffDeckLists(previous, list)`), changed cards are marked green / red and
 * cards cut since the previous version are appended, struck through.
 */
const CardList = ({
  cards,
  firstDivider = false,
  changes,
}: {
  cards: CardRef[];
  firstDivider?: boolean;
  changes?: DeckCardChange[];
}) => {
  const byKey = new Map((changes ?? []).map((c) => [deckCardKey(c.name), c]));
  const removed = (changes ?? []).filter((c) => c.after === 0);
  const rows = [
    ...cards.map((card) => ({ card, change: byKey.get(deckCardKey(card.name)) })),
    ...removed.map((c) => ({
      card: { name: c.name, code: null, count: c.before } as CardRef,
      change: c,
    })),
  ];

  return rows.length === 0 ? (
    <Text className="pb-3 pt-1 text-[13px] text-ink-tertiary">None</Text>
  ) : (
    <>
      {rows.map(({ card, change }, i) => (
        <CardRow
          key={`${card.name}-${i}`}
          card={card}
          divider={i > 0 || firstDivider}
          change={change}
        />
      ))}
    </>
  );
};

export default CardList;
