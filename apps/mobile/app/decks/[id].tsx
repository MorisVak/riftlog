import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchDeck,
  fetchDeckVersions,
  renameDeck,
  type Deck,
  type DeckVersion,
} from '@/lib/decks';
import { diffDeckLists } from '@riftlog/core';
import DeckVersions, {
  formatVersionDate,
} from '@/components/deck/deckVersions';
import ChangesToggle, {
  type CompareOption,
} from '@/components/deck/changesToggle';
import DeckView, { type DeckLayout } from '@/components/deck/deckView';
import DeckNameEditor from '@/components/deck/deckNameEditor';
import Icon from '@/components/icon';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

type LoadState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      deck: Deck;
      /** The deck's whole history, oldest first (version 1 = first import). */
      versions: DeckVersion[];
      /** Set when showing an earlier version (the list a match was played
       *  with, or one picked from "Show versions") instead of the current. */
      played: DeckVersion | null;
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
 * With a `version` param (a match's deck link, see `deckHref`, or a row in
 * "Show versions") it shows that version read-only, with its number, a
 * before/after against the current list, and a way back to the current list.
 * If that version is still current, it's just the normal view.
 *
 * At the bottom, "Show versions" lists the deck's history once it has more
 * than one version. Renames don't create versions — the name lives on the
 * deck — so the history always starts from the first imported list.
 */
const DeckDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, version, from } = useLocalSearchParams<{
    id: string;
    version?: string;
    /** 'versions' when opened from this deck's own version list. */
    from?: string;
  }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const intro = useSharedValue(0);
  const introStyle = useRise(intro);

  // Whether the deck has been shown: later loads refresh in place, without
  // the loading text or the intro.
  const shown = useRef(false);
  // "Show changes": mark what the shown version changed from the one before.
  const [showChanges, setShowChanges] = useState(false);
  // List or gallery, for this visit (not persisted).
  const [layout, setLayout] = useState<DeckLayout>('list');
  // Which earlier version to compare with; null = the one just before.
  const [compareId, setCompareId] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    const quiet = shown.current;
    if (!quiet) setState({ kind: 'loading' });
    Promise.all([fetchDeck(id), fetchDeckVersions(id)])
      .then(([deck, versions]) => {
        // An earlier version, when a link asked for one that isn't current.
        const played =
          deck && version && version !== deck.versionId
            ? (versions.find((v) => v.id === version) ?? null)
            : null;
        if (!active) return;
        if (deck && version && version !== deck.versionId && !played) {
          setState({ kind: 'missing' });
          return;
        }
        setState(
          deck
            ? { kind: 'ready', deck, versions, played }
            : { kind: 'missing' },
        );
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

  // The version on screen (an earlier one, or the current), and the one
  // before it — what "Show changes" compares against. Version 1 has none.
  const shownIndex =
    state.kind === 'ready'
      ? state.versions.findIndex(
          (v) => v.id === (state.played?.id ?? state.deck.versionId),
        )
      : -1;
  // Earlier versions to compare with, newest first; the first is the default.
  const earlier: CompareOption[] =
    state.kind === 'ready' && shownIndex > 0
      ? state.versions
          .slice(0, shownIndex)
          .map((v, i) => ({
            id: v.id,
            label: `Version ${i + 1}`,
            date: formatVersionDate(v.createdAt),
          }))
          .reverse()
      : [];
  const previous =
    state.kind === 'ready' && earlier.length > 0
      ? (state.versions.find((v) => v.id === (compareId ?? earlier[0]?.id)) ??
        null)
      : null;

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
                    Version{' '}
                    {state.versions.findIndex(
                      (v) => v.id === state.played?.id,
                    ) + 1}{' '}
                    of {state.versions.length}, from{' '}
                    {formatVersionDate(state.played.createdAt)}. You&apos;ve
                    edited this deck since.
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="link"
                    onPress={() =>
                      // From the version list, the current deck is the
                      // screen underneath; otherwise open it.
                      from === 'versions' && router.canGoBack()
                        ? router.back()
                        : router.push({
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
                    <Icon
                      name="chevron-right"
                      size={15}
                      className="text-accent"
                    />
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
              layout={layout}
              onLayoutChange={setLayout}
              changes={
                previous && showChanges
                  ? diffDeckLists(
                      previous.list,
                      state.played?.list ?? state.deck.list,
                    )
                  : null
              }
            />
            {/* Below the list, so the decklist itself stays clean. */}
            {previous && (
              <ChangesToggle
                on={showChanges}
                onChange={setShowChanges}
                options={earlier}
                selectedId={previous.id}
                onSelect={setCompareId}
              />
            )}
            {!state.played && state.versions.length > 1 && (
              <DeckVersions
                versions={state.versions}
                currentId={state.deck.versionId}
                onOpen={(versionId) =>
                  router.push({
                    pathname: '/decks/[id]',
                    params: {
                      id: state.deck.id,
                      version: versionId,
                      from: 'versions',
                    },
                  })
                }
              />
            )}
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
