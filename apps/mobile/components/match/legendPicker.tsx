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
import CardArt, { CardBackdrop } from '@/components/deck/cardArt';
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
 * A legend field for match setup ("Their legend", "Your legend"): shows the
 * pick (its art as the backdrop) and opens a page sheet with every legend as
 * a searchable art grid. One tap picks and closes. `optional` adds "Clear" to
 * the sheet; without it there's no way back to none — setup requires their
 * legend whenever the catalog is loaded. With no catalog the field says so
 * and setup lets the match start anyway.
 */
const LegendPicker = ({
  value,
  onChange,
  title,
  placeholder,
  optional = false,
}: {
  value: CardRef | null;
  onChange: (legend: CardRef | null) => void;
  /** The sheet's title and the field's spoken name, e.g. "Their legend". */
  title: string;
  /** The empty field's text, e.g. "Choose their legend". */
  placeholder: string;
  /** Can be cleared back to none. */
  optional?: boolean;
}) => {
  const legends = useLegends();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? legends : legends.filter((l) => l.name.toLowerCase().includes(q));
  }, [legends, query]);

  const tileW = Math.floor((width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const valueName = value ? splitCardName(value.name) : null;

  if (legends.length === 0) {
    return (
      <View className="min-h-[52px] justify-center rounded-xl border border-border bg-elevated px-4 py-3">
        <Text className="text-[13px] leading-[18px] text-ink-tertiary">
          Legends show up once the card list has downloaded. You can start without one.
        </Text>
      </View>
    );
  }

  const choose = (legend: CardRef | null) => {
    Haptics.selectionAsync();
    onChange(legend);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value ? value.name : 'not chosen'}`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setQuery('');
          setOpen(true);
        }}
        // TouchableOpacity dims everything, the legend art included.
        className="relative min-h-[52px] flex-row items-center gap-3 overflow-hidden rounded-xl border border-border bg-elevated px-4 py-3"
      >
        {value && <CardBackdrop card={value} fill="elevated" />}
        <View className="flex-1">
          {valueName ? (
            <>
              <Text className="font-display text-base text-ink-primary" numberOfLines={1}>
                {valueName.head}
              </Text>
              {valueName.title !== '' && (
                <Text className="mt-0.5 text-[13px] text-ink-secondary" numberOfLines={1}>
                  {valueName.title}
                </Text>
              )}
            </>
          ) : (
            <Text className="text-base text-ink-secondary">{placeholder}</Text>
          )}
        </View>
        <Icon name="chevron-right" size={18} className="text-ink-secondary" />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setOpen(false)}
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
              const { head, title } = splitCardName(item.name);
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
                  {title !== '' && (
                    <Text className="text-[11px] leading-[14px] text-ink-secondary" numberOfLines={2}>
                      {title}
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
};

export default LegendPicker;
