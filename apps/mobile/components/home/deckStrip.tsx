import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { splitCardName } from '@riftlog/core';
import type { Deck } from '@/lib/decks';
import type { HistoryRowVM } from '@/lib/historyView';
import { LegendPortrait } from '@/components/deck/cardArt';
import PressOverlay from '@/components/pressOverlay';
import Icon from '@/components/icon';

/** How many decks the strip shows; the rest are a tap away in Decks. */
const MAX_DECKS = 8;
const TILE_W = 132;

type DeckTile = { deck: Deck; wins: number; losses: number; played: number };

/**
 * Your decks, most recently played first (then the rest by last edit), with
 * your record with each — your own matches only (Riot policy).
 */
const tilesFor = (decks: Deck[], vms: HistoryRowVM[]): DeckTile[] => {
  const lastPlayed = new Map<string, number>();
  const record = new Map<string, { wins: number; losses: number; played: number }>();
  vms.forEach((vm, i) => {
    const id = vm.deck?.id;
    if (!id) return;
    if (!lastPlayed.has(id)) lastPlayed.set(id, i); // vms are newest first
    const r = record.get(id) ?? { wins: 0, losses: 0, played: 0 };
    r.played += 1;
    if (vm.result === 'win') r.wins += 1;
    if (vm.result === 'loss') r.losses += 1;
    record.set(id, r);
  });
  return [...decks]
    .sort((a, b) => {
      const pa = lastPlayed.get(a.id) ?? Infinity;
      const pb = lastPlayed.get(b.id) ?? Infinity;
      return pa !== pb ? pa - pb : b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, MAX_DECKS)
    .map((deck) => ({ deck, ...(record.get(deck.id) ?? { wins: 0, losses: 0, played: 0 }) }));
};

const Tile = ({
  tile,
  isDefault,
  onPress,
}: {
  tile: DeckTile;
  isDefault: boolean;
  onPress: () => void;
}) => {
  const legend = tile.deck.list.legend;
  // Built outside the press callback: a press redraws only the overlay.
  const content = (
    <>
      <View className="h-[92px] overflow-hidden bg-elevated">
        {legend && <LegendPortrait card={legend} />}
        {isDefault && (
          <View className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5">
            <Text className="font-display text-[11px] text-accent">Default</Text>
          </View>
        )}
      </View>
      <View className="px-3 pb-3 pt-2">
        <Text className="font-display-bold text-[14px] text-ink-primary" numberOfLines={1}>
          {tile.deck.name}
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink-secondary" numberOfLines={1}>
          {legend ? splitCardName(legend.name).head : 'No legend'}
        </Text>
        <Text className="mt-1.5 font-mono text-[12px] text-ink-secondary">
          {tile.played === 0 ? (
            'Not played yet'
          ) : (
            <>
              <Text className="text-win-text">{tile.wins}</Text>
              {'–'}
              <Text className="text-loss-text">{tile.losses}</Text>
            </>
          )}
        </Text>
      </View>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tile.deck.name}${isDefault ? ', default deck' : ''}. ${
        tile.played === 0 ? 'Not played yet' : `${tile.wins} wins, ${tile.losses} losses`
      }. Open deck`}
      onPress={onPress}
      style={{ width: TILE_W }}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface"
    >
      {({ pressed }) => (
        <>
          {content}
          <PressOverlay pressed={pressed} />
        </>
      )}
    </Pressable>
  );
};

/**
 * Home's "Your decks": a row of deck tiles to scroll sideways — each deck's
 * legend, name and your record with it — ending in an Import tile. Rounds
 * Home out: play (the hero), how it's going (your matches), what you play
 * with (your decks). Signed in, with at least one deck.
 */
const DeckStrip = ({
  decks,
  vms,
  defaultDeckId,
  onOpen,
  onImport,
}: {
  decks: Deck[];
  vms: HistoryRowVM[];
  defaultDeckId: string | null;
  onOpen: (deck: Deck) => void;
  onImport: () => void;
}) => {
  const tiles = useMemo(() => tilesFor(decks, vms), [decks, vms]);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-3.5"
      contentContainerClassName="gap-2.5 px-3.5"
    >
      {tiles.map((t) => (
        <Tile
          key={t.deck.id}
          tile={t}
          isDefault={t.deck.id === defaultDeckId}
          onPress={() => onOpen(t.deck)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Import a deck"
        onPress={onImport}
        style={{ width: TILE_W }}
        className="items-center justify-center rounded-2xl border border-dashed border-border active:bg-surface"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-accent/15">
          <Icon name="plus" size={18} className="text-accent" />
        </View>
        <Text className="mt-2 font-display text-[14px] text-ink-primary">Import deck</Text>
      </Pressable>
    </ScrollView>
  );
};

export default DeckStrip;
