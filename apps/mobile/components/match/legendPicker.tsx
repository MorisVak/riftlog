import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { splitCardName, type CardRef } from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';
import Icon from '@/components/icon';
import { useCatalog } from '@/contexts/catalogContext';

/**
 * Every legend in the card catalog, as a card reference to its base printing
 * (the art the grid shows), sorted by name. Empty while there's no catalog.
 */
export function useLegends(): CardRef[] {
  const { index } = useCatalog();
  return useMemo(() => {
    if (!index) return [];
    const out: CardRef[] = [];
    for (const card of index.cardById.values()) {
      if (card.type !== 'Legend') continue;
      out.push({ name: card.name, code: index.basePrinting.get(card.id)?.code ?? null, count: 1 });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [index]);
}

const COLUMNS = 3;
const GAP = 12;
const PAD = 16;

/**
 * Pick a legend: a page sheet with every legend in the catalog as a
 * searchable art grid. One tap picks and closes. `optional` adds "Clear"
 * (back to none). Opened by match setup's legend portraits.
 */
export const LegendSheet = ({
  visible,
  onClose,
  value,
  onChange,
  title,
  optional = false,
}: {
  visible: boolean;
  onClose: () => void;
  value: CardRef | null;
  onChange: (legend: CardRef | null) => void;
  /** The sheet's title, e.g. "Their legend". */
  title: string;
  /** Can be cleared back to none. */
  optional?: boolean;
}) => {
  const legends = useLegends();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? legends : legends.filter((l) => l.name.toLowerCase().includes(q));
  }, [legends, query]);
  const tileW = Math.floor((width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const choose = (legend: CardRef | null) => {
    Haptics.selectionAsync();
    onChange(legend);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // A fresh search each time it opens.
      onShow={() => setQuery('')}
    >
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onClose}
            className="h-11 min-w-[72px] justify-center"
          >
            <Text className="font-display text-[16px] text-ink-secondary">Cancel</Text>
          </TouchableOpacity>
          <Text className="font-display-bold text-[16px] text-ink-primary">{title}</Text>
          {optional && value ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Clear ${title.toLowerCase()}`}
              onPress={() => choose(null)}
              className="h-11 min-w-[72px] items-end justify-center"
            >
              <Text className="font-display text-[16px] text-accent">Clear</Text>
            </TouchableOpacity>
          ) : (
            <View className="min-w-[72px]" />
          )}
        </View>

        <View className="border-b border-border/60 px-4 py-3">
          <View className="flex-row items-center gap-2 rounded-xl border border-border bg-elevated px-3">
            <Icon name="search" size={16} className="text-ink-tertiary" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search legends"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search legends"
              className="h-11 flex-1 text-[16px] text-ink-primary placeholder:text-ink-tertiary"
            />
          </View>
        </View>

        <FlatList
          data={shown}
          keyExtractor={(l) => l.name}
          numColumns={COLUMNS}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: PAD, gap: GAP + 4 }}
          columnWrapperStyle={{ gap: GAP }}
          ListEmptyComponent={
            <Text className="mt-8 text-center text-[14px] text-ink-secondary">
              No legend matches “{query.trim()}”.
            </Text>
          }
          renderItem={({ item }) => {
            const { head, title: subtitle } = splitCardName(item.name);
            const selected = value?.name === item.name;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.name}
                accessibilityState={{ selected }}
                onPress={() => choose(item)}
                style={{ width: tileW }}
                className="active:opacity-60"
              >
                <View className={`rounded-[10px] p-0.5 ${selected ? 'bg-accent' : ''}`}>
                  <CardArt card={item} variant="tile" width={tileW - 4} />
                </View>
                <Text
                  className={`mt-1.5 font-display text-[13px] ${selected ? 'text-accent' : 'text-ink-primary'}`}
                  numberOfLines={1}
                >
                  {head}
                </Text>
                {subtitle !== '' && (
                  <Text className="text-[11px] leading-[14px] text-ink-secondary" numberOfLines={2}>
                    {subtitle}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
};
