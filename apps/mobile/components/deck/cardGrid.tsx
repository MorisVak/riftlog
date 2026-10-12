import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { deckCardKey, type CardRef, type DeckCardChange } from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';
import type { CardChange } from '@/components/deck/cardRow';

const COLUMNS = 3;
const GAP = 8;

type Tile = { card: CardRef; tag?: string; change?: CardChange };

/**
 * A section's cards as a gallery: a 3-column grid of card tiles (art via
 * `CardArt`'s `tile` variant — today a named placeholder) with a "×n" count
 * badge, like Piltover Archive's gallery view. The gallery counterpart of
 * `CardList`, taking the same `changes`: changed tiles get a green / red
 * badge and label, and cards cut since the compared version are appended,
 * faded and labelled "Removed".
 *
 * Tile width is measured from the container (`onLayout`), so the grid fits
 * any screen without hard-coded sizes.
 */
const CardGrid = ({
  cards,
  lead = [],
  changes,
}: {
  cards: CardRef[];
  /** Tiles placed first, e.g. the chosen champion (tagged). */
  lead?: Tile[];
  changes?: DeckCardChange[];
}) => {
  const [width, setWidth] = useState(0);
  const tileW = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  const byKey = new Map((changes ?? []).map((c) => [deckCardKey(c.name), c]));
  const tiles: Tile[] = [
    ...lead,
    ...cards.map((card) => ({ card, change: byKey.get(deckCardKey(card.name)) })),
    ...(changes ?? [])
      .filter((c) => c.after === 0)
      .map((c) => ({
        card: { name: c.name, code: null, count: c.before } as CardRef,
        change: c,
      })),
  ];

  if (tiles.length === 0) {
    return <Text className="pb-3 pt-1 text-[13px] text-ink-tertiary">None</Text>;
  }

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="flex-row flex-wrap pb-3 pt-1.5"
      style={{ gap: GAP }}
    >
      {tileW > 0 &&
        tiles.map((t, i) => (
          <CardTile key={`${t.card.name}-${i}`} tile={t} width={tileW} />
        ))}
    </View>
  );
};

const CardTile = ({ tile, width }: { tile: Tile; width: number }) => {
  const { card, tag, change } = tile;
  const up = change !== undefined && change.after > change.before;
  const removed = change !== undefined && change.after === 0;
  const label = change
    ? change.before === 0
      ? 'New'
      : removed
        ? 'Removed'
        : up
          ? `+${change.after - change.before}`
          : `−${change.before - change.after}`
    : null;

  return (
    <View
      accessible
      accessibilityLabel={`${card.count} ${card.name}${tag ? `, ${tag}` : ''}${
        label ? `, ${label.replace('−', 'minus ')}` : ''
      }`}
      style={{ width, opacity: removed ? 0.55 : 1 }}
    >
      <CardArt card={card} variant="tile" width={width} />
      {/* ×n, bottom-right over the art, as on Piltover Archive. */}
      <View
        className={`absolute bottom-1.5 right-1.5 rounded-md px-1.5 py-0.5 ${
          change ? (up ? 'bg-added-tint' : 'bg-cut-tint') : 'bg-background/80'
        }`}
      >
        <Text
          className={`font-mono-medium text-[12px] ${
            change ? (up ? 'text-added' : 'text-cut') : 'text-ink-primary'
          } ${removed ? 'line-through' : ''}`}
        >
          ×{card.count}
        </Text>
      </View>
      {(tag || label) && (
        <View className="absolute left-1.5 top-1.5 flex-row gap-1">
          {tag && (
            <View className="rounded-full bg-accent/25 px-1.5 py-0.5">
              <Text className="font-display text-[10px] text-accent">{tag}</Text>
            </View>
          )}
          {label && (
            <View
              className={`rounded-full px-1.5 py-0.5 ${up ? 'bg-added-tint' : 'bg-cut-tint'}`}
            >
              <Text
                className={`font-mono-medium text-[10px] ${up ? 'text-added' : 'text-cut'}`}
              >
                {label}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default CardGrid;
