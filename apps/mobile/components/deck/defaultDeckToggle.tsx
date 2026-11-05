import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useProfile } from '@/contexts/profileContext';
import { setDefaultDeck } from '@/lib/profile';
import Icon from '@/components/icon';

/**
 * On a deck's own screen: make it your default deck (the one a new match
 * starts with, shown on Home's hero), or — when it already is — say so; tap
 * again to remove it. Where you look at a deck is where you'd look to pick
 * it; Home's hero ("Change") and Profile change the same setting.
 */
const DefaultDeckToggle = ({ deckId }: { deckId: string }) => {
  const { profile, refresh } = useProfile();
  // Shown optimistically while the save is in flight.
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const current = pending !== undefined ? pending : (profile?.defaultDeckId ?? null);
  const isDefault = current === deckId;

  const save = (id: string | null) => {
    setPending(id);
    setDefaultDeck(id)
      .then(() => {
        return refresh();
      })
      .catch((e) => {
        if (__DEV__) console.warn('[deck] default deck save failed:', e);
        Alert.alert('Could not save', 'Please check your connection and try again.');
      })
      .finally(() => setPending(undefined));
  };

  // A pill in the deck screen's top bar, beside "Edit list": seen as soon
  // as the deck opens. Filled in the accent while it's the default.
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isDefault ? 'Default deck. Tap to remove as default' : 'Make default deck'}
      accessibilityState={{ selected: isDefault }}
      onPress={() => {
        Haptics.selectionAsync();
        save(isDefault ? null : deckId);
      }}
      hitSlop={8}
      className={`h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
        isDefault
          ? 'border-accent bg-accent/20 active:bg-accent/30'
          : 'border-border bg-elevated active:bg-surface'
      }`}
    >
      <Icon name={isDefault ? 'check' : 'star'} size={14} className="text-accent" />
      <Text className="font-display text-[15px] text-accent">
        {isDefault ? 'Default' : 'Make default'}
      </Text>
    </TouchableOpacity>
  );
};

export default DefaultDeckToggle;
