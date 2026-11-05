import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  legendArtOptions,
  legendArtPrinting,
  NO_LEGEND_ART,
  splitCardName,
  type CatalogCard,
  type CatalogPrinting,
  type LegendArt,
} from '@riftlog/core';
import { useCatalog } from '@/contexts/catalogContext';
import { useProfile } from '@/contexts/profileContext';
import { setLegendArt } from '@/lib/profile';
import CardArt from '@/components/deck/cardArt';
import Icon from '@/components/icon';

// Switch colors are props, not classNames — mirrors of the tokens
// (tailwind.config.js): accent / border / ink-primary.
const ACCENT = '#8B93D9';
const BORDER = '#3E506E';
const THUMB = '#E4E5F2';

const COLUMNS = 3;
const GAP = 12;
const PAD = 16;

/** What a printing is, in a word — under its art in the picker. */
const printingLabel = (p: CatalogPrinting): string =>
  p.signed
    ? 'Signed'
    : p.overnumbered
      ? 'Overnumbered'
      : p.promo
        ? 'Promo'
        : p.alt_art
          ? 'Alt art'
          : 'Standard';

/**
 * Profile → Legend art: which art legends are drawn with across the app —
 * deck cards, match rows, the hero, the board, the versus screens. Display
 * only: decklists, the card sheet and deck codes keep each deck's own
 * printing. One toggle prefers the overnumbered art everywhere; tapping a
 * legend picks its art by hand (that wins over the toggle). Saved on the
 * profile, so it follows the account.
 */
const LegendArtScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { index } = useCatalog();
  const { profile, refresh } = useProfile();
  // Shown optimistically while a save is in flight.
  const [pending, setPending] = useState<LegendArt | null>(null);
  const pref = pending ?? profile?.legendArt ?? NO_LEGEND_ART;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<CatalogCard | null>(null);

  const legends = useMemo(() => {
    if (!index) return [];
    return [...index.cardById.values()]
      .filter((c) => c.type === 'Legend')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [index]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? legends.filter((c) => c.name.toLowerCase().includes(q)) : legends;
  }, [legends, query]);

  const save = (next: LegendArt) => {
    setPending(next);
    setLegendArt(next)
      .then(() => refresh())
      .catch((e) => {
        if (__DEV__) console.warn('[legend art] save failed:', e);
        Alert.alert('Could not save', 'Please check your connection and try again.');
      })
      .finally(() => setPending(null));
  };

  const pick = (card: CatalogCard, code: string | null) => {
    Haptics.selectionAsync();
    const picks = { ...pref.picks };
    if (code) picks[card.id] = code;
    else delete picks[card.id];
    save({ ...pref, picks });
    setOpen(null);
  };

  const tileW = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const base = (c: CatalogCard) => (index ? (index.basePrinting.get(c.id) ?? null) : null);
  const shownPrinting = (c: CatalogCard) =>
    index ? legendArtPrinting(c, base(c), pref, index) : null;

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center gap-3 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-elevated active:bg-surface"
        >
          <Icon name="chevron-left" size={18} className="text-ink-secondary" />
        </TouchableOpacity>
        <Text className="font-display-bold text-lg text-ink-primary">Legend art</Text>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(c) => c.id}
        numColumns={COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{
          paddingHorizontal: PAD,
          paddingBottom: insets.bottom + 32,
          gap: GAP,
        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="gap-3 pb-1">
            <Text className="px-1 text-[13px] leading-[18px] text-ink-secondary">
              How legends look across the app — on your decks, matches and the board. Your decklists
              and deck codes keep their own printings.
            </Text>
            <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <View className="flex-1">
                <Text className="font-display text-[15px] text-ink-primary">
                  Prefer overnumbered art
                </Text>
                <Text className="mt-0.5 text-[12px] text-ink-tertiary">
                  For every legend that has it. A legend you pick below keeps your pick.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Prefer overnumbered art"
                value={pref.overnumbered}
                onValueChange={(on) => {
                  Haptics.selectionAsync();
                  save({ ...pref, overnumbered: on });
                }}
                trackColor={{ false: BORDER, true: ACCENT }}
                thumbColor={THUMB}
                ios_backgroundColor={BORDER}
              />
            </View>
            <View className="flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
              <Icon name="search" size={16} className="text-ink-tertiary" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search legends"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                accessibilityLabel="Search legends"
                className="h-11 flex-1 text-[16px] text-ink-primary placeholder:text-ink-tertiary"
              />
            </View>
          </View>
        }
        renderItem={({ item: c }) => {
          const p = shownPrinting(c);
          const picked = pref.picks[c.id] !== undefined;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.name}: ${p ? printingLabel(p) : 'no art'}${
                picked ? ', your pick' : ''
              }. Choose art`}
              onPress={() => setOpen(c)}
              style={{ width: tileW }}
              className="active:opacity-80"
            >
              <CardArt
                card={{ name: c.name, code: p?.code ?? null, count: 1 }}
                variant="tile"
                width={tileW}
              />
              <Text className="mt-1.5 font-display text-[13px] text-ink-primary" numberOfLines={1}>
                {splitCardName(c.name).head}
              </Text>
              <Text
                className={`text-[11px] ${picked ? 'text-accent' : 'text-ink-tertiary'}`}
                numberOfLines={1}
              >
                {p ? printingLabel(p) : '—'}
                {picked ? ' · your pick' : ''}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="pt-10 text-center text-sm text-ink-secondary">
            {index ? 'No legends match.' : 'The card catalog hasn’t loaded yet.'}
          </Text>
        }
      />

      {/* One legend's printings to pick from; "Automatic" follows the toggle. */}
      <Modal
        visible={open !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(null)}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={() => setOpen(null)}
          className="flex-1 justify-end bg-background/80"
        >
          {open && index && (
            <Pressable
              accessible={false}
              className="rounded-t-3xl border border-b-0 border-border bg-elevated pt-4"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              <View className="flex-row items-center justify-between px-5 pb-3">
                <Text
                  className="flex-1 font-display-bold text-lg text-ink-primary"
                  numberOfLines={1}
                >
                  {open.name}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setOpen(null)}
                  className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
                >
                  <Icon name="x" size={16} className="text-ink-secondary" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: pref.picks[open.id] === undefined }}
                onPress={() => pick(open, null)}
                className="mx-5 mb-3 flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <View className="flex-1">
                  <Text className="font-display text-[15px] text-ink-primary">Automatic</Text>
                  <Text className="mt-0.5 text-[12px] text-ink-tertiary">
                    {pref.overnumbered
                      ? 'Overnumbered art when there is one.'
                      : 'Each deck’s own printing.'}
                  </Text>
                </View>
                {pref.picks[open.id] === undefined && (
                  <Icon name="check" size={18} className="text-accent" />
                )}
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              >
                {legendArtOptions(open, index).map((p) => {
                  const selected = pref.picks[open.id] === p.code;
                  return (
                    <Pressable
                      key={p.code}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${printingLabel(p)}, ${p.code}`}
                      onPress={() => pick(open, p.code)}
                      className="items-center active:opacity-80"
                    >
                      <View
                        className={`rounded-xl border-2 p-0.5 ${selected ? 'border-accent' : 'border-transparent'}`}
                      >
                        <CardArt
                          card={{ name: open.name, code: p.code, count: 1 }}
                          variant="tile"
                          width={120}
                        />
                      </View>
                      <Text
                        className={`mt-1.5 font-display text-[13px] ${selected ? 'text-accent' : 'text-ink-primary'}`}
                      >
                        {printingLabel(p)}
                      </Text>
                      <Text className="font-mono text-[11px] text-ink-tertiary">{p.code}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
};

export default LegendArtScreen;
