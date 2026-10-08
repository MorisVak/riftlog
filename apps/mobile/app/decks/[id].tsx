import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDeck, fetchDeckVersion, renameDeck, type Deck } from '@/lib/decks';
import type { DeckList } from '@riftlog/core';
import DeckView from '@/components/deck/deckView';
import DeckNameEditor from '@/components/deck/deckNameEditor';
import Icon from '@/components/icon';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

type LoadState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      deck: Deck;
      /** Set when showing an earlier version (the list a match was played
       *  with) instead of the current one. */
      played: { list: DeckList; createdAt: string } | null;
    }
  | { kind: 'missing' }
  | { kind: 'error' };

/**
 * One saved deck, read from Postgres (its current version). The name can be
 * changed in place; "Edit list" opens the import screen in edit mode
 * (`/decks/import?deckId=…`), which saves a new immutable version. The deck
 * re-reads on every focus — quietly, once it's on screen — so returning from
 * an edit shows the new list.
 *
 * With a `version` param (a match's deck link, see `deckHref`) it shows that
 * version — the list AS PLAYED — read-only, with a note and a way to the
 * current list. If that version is still current, it's just the normal view.
 */
const DeckDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, version } = useLocalSearchParams<{
    id: string;
    version?: string;
  }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const intro = useSharedValue(0);
  const introStyle = useRise(intro);

  // Whether the deck has been shown: later loads refresh in place, without
  // the loading text or the intro.
  const shown = useRef(false);

  const load = useCallback(() => {
    let active = true;
    const quiet = shown.current;
    if (!quiet) setState({ kind: 'loading' });
    fetchDeck(id)
      .then(async (deck) => {
        // An earlier version, when a match link asked for one that isn't
        // current any more.
        const played =
          deck && version && version !== deck.versionId
            ? await fetchDeckVersion(id, version)
            : null;
        if (!active) return;
        if (deck && version && version !== deck.versionId && !played) {
          setState({ kind: 'missing' });
          return;
        }
        setState(deck ? { kind: 'ready', deck, played } : { kind: 'missing' });
        if (deck && !quiet) {
          shown.current = true;
          playIntro([intro]);
        }
      })
      .catch(() => {
        // A failed quiet refresh keeps the deck already on screen.
        if (active && !quiet) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [id, version, intro]);

  useFocusEffect(load);

  const rename = async (name: string) => {
    if (state.kind !== 'ready') return;
    const saved = await renameDeck(state.deck.id, name);
    setState({
      ...state,
      deck: { ...state.deck, name: saved.name, updatedAt: saved.updatedAt },
    });
  };

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
        {state.kind === 'ready' && !state.played && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit decklist"
            onPress={() =>
              router.push({
                pathname: '/decks/import',
                params: { deckId: state.deck.id },
              })
            }
            hitSlop={8}
            className="ml-auto h-9 flex-row items-center gap-1.5 rounded-full border border-border bg-elevated px-3.5 active:bg-surface"
          >
            <Icon name="list" size={14} className="text-accent" />
            <Text className="font-display text-[15px] text-accent">
              Edit list
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {state.kind === 'ready' ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={introStyle}>
            {state.played && (
              <View className="mb-5 flex-row gap-3 rounded-2xl border border-border bg-surface p-4">
                <Icon name="clock" size={16} className="mt-0.5 text-accent" />
                <View className="flex-1">
                  <Text className="font-display-bold text-[15px] text-ink-primary">
                    Outdated version
                  </Text>
                  <Text className="mt-1 text-[13px] leading-[18px] text-ink-secondary">
                    You&apos;ve edited this deck since. This version is from{' '}
                    {new Date(state.played.createdAt).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                    .
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="link"
                    onPress={() =>
                      router.push({
                        pathname: '/decks/[id]',
                        params: { id: state.deck.id },
                      })
                    }
                    hitSlop={8}
                    className="mt-2.5 flex-row items-center gap-1 self-start"
                  >
                    <Text className="font-display text-[14px] text-accent">
                      See current list
                    </Text>
                    <Icon name="chevron-right" size={15} className="text-accent" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <DeckView
              name={state.deck.name}
              list={state.played?.list ?? state.deck.list}
              // An earlier version is read-only: no rename from here.
              title={
                state.played ? undefined : (
                  <DeckNameEditor name={state.deck.name} onSave={rename} />
                )
              }
            />
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
