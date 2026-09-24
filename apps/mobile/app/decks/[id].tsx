import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDeck, type Deck } from '@/lib/decks';
import DeckView from '@/components/deck/deckView';
import Icon from '@/components/icon';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; deck: Deck }
  | { kind: 'missing' }
  | { kind: 'error' };

/**
 * One saved deck, read from Postgres (its current version). Read-only:
 * editing — which will add a new immutable version — isn't built yet.
 */
const DeckDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const intro = useSharedValue(0);
  const introStyle = useRise(intro);

  const load = useCallback(() => {
    let active = true;
    setState({ kind: 'loading' });
    fetchDeck(id)
      .then((deck) => {
        if (!active) return;
        setState(deck ? { kind: 'ready', deck } : { kind: 'missing' });
        if (deck) playIntro([intro]);
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [id, intro]);

  useEffect(load, [load]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
        >
          <Icon name="chevron-left" size={18} className="text-ink-secondary" />
        </TouchableOpacity>
      </View>

      {state.kind === 'ready' ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={introStyle}>
            <DeckView name={state.deck.name} list={state.deck.list} />
          </Animated.View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          {state.kind === 'loading' ? (
            <Text className="text-sm text-ink-tertiary">Loading deck…</Text>
          ) : (
            <>
              <Text className="text-center text-sm text-ink-secondary">
                {state.kind === 'missing'
                  ? "This deck doesn't exist or isn't yours."
                  : "Couldn't load this deck. Check your connection."}
              </Text>
              {state.kind === 'error' && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={load}
                  className="mt-3 px-4 py-2"
                >
                  <Text className="font-display text-sm text-accent">
                    Try again
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default DeckDetail;
