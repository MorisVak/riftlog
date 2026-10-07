import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { deckDomains } from '@riftlog/core';
import { fetchMyDecks, type Deck } from '@/lib/decks';
import { DomainChips } from '@/components/deck/domain';
import Icon from '@/components/icon';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; decks: Deck[] }
  | { kind: 'error' };

/**
 * "Your deck" in the pre-match setup sheet: a dropdown of the player's saved
 * decks, with "No deck" first — choosing a deck is optional. Signed-in only
 * (the caller hides it for guests, who have no decks and whose matches aren't
 * saved).
 *
 * Inline rather than a native picker: the open list pushes the sheet's
 * content down and scrolls on its own if there are many decks.
 */
const DeckPicker = ({
  value,
  onChange,
}: {
  value: Deck | null;
  onChange: (deck: Deck | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    fetchMyDecks()
      .then((decks) => active && setState({ kind: 'ready', decks }))
      .catch(() => active && setState({ kind: 'error' }));
    return () => {
      active = false;
    };
  }, []);

  const choose = (deck: Deck | null) => {
    Haptics.selectionAsync();
    onChange(deck);
    setOpen(false);
  };

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((o) => !o);
  };

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Your deck: ${value ? value.name : 'no deck'}`}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        className={`min-h-[48px] flex-row items-center gap-3 rounded-xl border bg-elevated px-4 py-3 ${
          open ? 'border-accent' : 'border-border'
        }`}
      >
        <Icon
          name="layers"
          size={16}
          className={value ? 'text-accent' : 'text-ink-tertiary'}
        />
        <View className="flex-1">
          <Text
            className={`text-base ${value ? 'text-ink-primary' : 'text-ink-secondary'}`}
            numberOfLines={1}
          >
            {value ? value.name : 'No deck'}
          </Text>
          {value?.list.legend && (
            <Text className="mt-0.5 text-xs text-ink-secondary" numberOfLines={1}>
              {value.list.legend.name}
            </Text>
          )}
        </View>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          className="text-ink-secondary"
        />
      </TouchableOpacity>

      {open && (
        <Animated.View
          entering={FadeIn.duration(150)}
          className="mt-2 overflow-hidden rounded-xl border border-border bg-elevated"
        >
          {state.kind === 'loading' ? (
            <Text className="px-4 py-4 text-sm text-ink-tertiary">
              Loading your decks…
            </Text>
          ) : state.kind === 'error' ? (
            <Text className="px-4 py-4 text-sm text-ink-secondary">
              {"Couldn't load your decks. You can still start without one."}
            </Text>
          ) : (
            <ScrollView
              className="max-h-52"
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Option
                label="No deck"
                selected={value === null}
                onPress={() => choose(null)}
              />
              {state.decks.map((deck) => (
                <Option
                  key={deck.id}
                  label={deck.name}
                  detail={deck.list.legend?.name}
                  deck={deck}
                  selected={value?.id === deck.id}
                  onPress={() => choose(deck)}
                />
              ))}
              {state.decks.length === 0 && (
                <Text className="border-t border-border/60 px-4 py-3 text-[13px] leading-[18px] text-ink-secondary">
                  No decks yet — import one from your Profile.
                </Text>
              )}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const Option = ({
  label,
  detail,
  deck,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  deck?: Deck;
  selected: boolean;
  onPress: () => void;
}) => {
  const domains = deck ? deckDomains(deck.list) : null;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[48px] flex-row items-center gap-3 border-b border-border/60 px-4 py-3 ${
        selected ? 'bg-accent/10' : 'active:bg-surface'
      }`}
    >
      <View className="flex-1">
        <Text
          className={`text-[15px] ${selected ? 'font-display text-ink-primary' : 'text-ink-primary'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {detail ? (
          <Text className="mt-0.5 text-xs text-ink-secondary" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {domains && (
          <View className="mt-1.5">
            <DomainChips domains={domains} />
          </View>
        )}
      </View>
      {selected && <Icon name="check" size={18} className="text-accent" />}
    </TouchableOpacity>
  );
};

export default DeckPicker;
