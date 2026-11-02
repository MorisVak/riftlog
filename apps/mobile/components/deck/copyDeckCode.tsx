import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { deckCodeFromList, encodeDeckCode, type DeckList } from '@riftlog/core';
import Icon from '@/components/icon';
import { useCatalog } from '@/contexts/catalogContext';

/**
 * "Copy deck code": the list as a deck code on the clipboard, to paste into
 * Piltover Archive or share. Cards keep their own printing; text-imported
 * cards (no code) use their catalog base printing. If a card has no printing
 * a deck code can carry, it says which instead of writing a partial code.
 */
const CopyDeckCode = ({ list }: { list: DeckList }) => {
  const { index } = useCatalog();
  const [state, setState] = useState<{ kind: 'idle' | 'copied' } | { kind: 'problem'; message: string }>({
    kind: 'idle',
  });

  // "Copied" fades back to the button after a moment.
  useEffect(() => {
    if (state.kind !== 'copied') return;
    const t = setTimeout(() => setState({ kind: 'idle' }), 2000);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    if (!index) {
      setState({ kind: 'problem', message: "The card catalog hasn't loaded yet. Connect to the internet and try again." });
      return;
    }
    const result = deckCodeFromList(list, index);
    if ('missing' in result) {
      const names = result.missing.slice(0, 3).join(', ') + (result.missing.length > 3 ? ', …' : '');
      setState({
        kind: 'problem',
        message: `Can't make a deck code: ${result.missing.length === 1 ? 'this card has' : 'these cards have'} no printing a code can carry (${names}).`,
      });
      return;
    }
    try {
      await Clipboard.setStringAsync(encodeDeckCode(result.deck));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setState({ kind: 'copied' });
    } catch {
      setState({ kind: 'problem', message: "Couldn't make a deck code for this list." });
    }
  };

  const copied = state.kind === 'copied';
  return (
    <View className="mt-4">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={copied ? 'Deck code copied' : 'Copy deck code'}
        onPress={() => void copy()}
        className="min-h-[52px] flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 active:bg-elevated"
      >
        <Icon name={copied ? 'check' : 'hash'} size={17} className="text-accent" />
        <Text className="flex-1 font-display text-[15px] text-ink-primary">
          {copied ? 'Deck code copied' : 'Copy deck code'}
        </Text>
        {!copied && <Icon name="copy" size={15} className="text-ink-tertiary" />}
      </TouchableOpacity>
      {state.kind === 'problem' && (
        <View className="mt-2 flex-row gap-2 px-1">
          <Icon name="alert-circle" size={13} className="mt-0.5 text-ink-primary" />
          <Text className="flex-1 text-[13px] leading-[18px] text-ink-primary">{state.message}</Text>
        </View>
      )}
    </View>
  );
};

export default CopyDeckCode;
