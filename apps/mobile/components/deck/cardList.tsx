import React from 'react';
import { Text } from 'react-native';
import type { CardRef } from '@riftlog/core';
import CardRow from '@/components/deck/cardRow';

/**
 * A section's cards as rows, or "None". `firstDivider` draws a hairline above
 * the first row when something (the chosen champion) sits above the list.
 */
const CardList = ({
  cards,
  firstDivider = false,
}: {
  cards: CardRef[];
  firstDivider?: boolean;
}) =>
  cards.length === 0 ? (
    <Text className="pb-3 pt-1 text-[13px] text-ink-tertiary">None</Text>
  ) : (
    <>
      {cards.map((card, i) => (
        <CardRow
          key={`${card.name}-${i}`}
          card={card}
          divider={i > 0 || firstDivider}
        />
      ))}
    </>
  );

export default CardList;
