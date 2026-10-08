import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchMatch,
  updateGameNote,
  updateMatchNote,
} from '@/lib/matchPersistence';
import { toMatchDetailVM, type MatchDetailVM } from '@/lib/matchDetailView';
import type { Result } from '@/lib/historyView';
import GameCard from '@/components/match/gameCard';
import NoteEditor from '@/components/match/noteEditor';
import NoteRow from '@/components/match/noteRow';
import Icon from '@/components/icon';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

/** Which note the editor is open on. */
type Editing = { kind: 'match' } | { kind: 'game'; gameId: string; n: number };

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; vm: MatchDetailVM }
  | { kind: 'missing' }
  | { kind: 'error' };

const RESULT: Record<Result, { bar: string; badge: string; text: string }> = {
  win: { bar: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { bar: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bar: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
};

/**
 * Match detail (from "View details" on a History row): the result, a per-game
 * breakdown with each game's score graph, and the deck you played.
 *
 * v1 shows YOUR side only. When match mode lands (SPEC Feature 8) this screen
 * gains the opponent: their deck (a "Decklist" card like yours), their linked
 * Riftlog profile, your head-to-head record, and their win rate. None of that
 * exists in the data yet, so nothing is shown for it — not even a teaser.
 */
const MatchDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [editing, setEditing] = useState<Editing | null>(null);

  const resultIntro = useSharedValue(0);
  const gamesIntro = useSharedValue(0);
  const deckIntro = useSharedValue(0);
  const resultStyle = useRise(resultIntro);
  const gamesStyle = useRise(gamesIntro);
  const deckStyle = useRise(deckIntro);

  const load = useCallback(() => {
    let active = true;
    setState({ kind: 'loading' });
    fetchMatch(id)
      .then((m) => {
        if (!active) return;
        setState(
          m ? { kind: 'ready', vm: toMatchDetailVM(m) } : { kind: 'missing' },
        );
        if (m) playIntro([resultIntro, gamesIntro, deckIntro]);
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [id, resultIntro, gamesIntro, deckIntro]);

  useEffect(load, [load]);

  // Notes save straight to Postgres (the match is long since saved), then the
  // screen updates from what was stored.
  const saveNote = async (text: string) => {
    if (state.kind !== 'ready' || !editing) return;
    const vm = state.vm;
    if (editing.kind === 'match') {
      const notes = await updateMatchNote(vm.id, text);
      setState({ kind: 'ready', vm: { ...vm, notes } });
    } else {
      const gameId = editing.gameId;
      const notes = await updateGameNote(gameId, text);
      setState({
        kind: 'ready',
        vm: {
          ...vm,
          detailGames: vm.detailGames.map((g) =>
            g.id === gameId ? { ...g, notes } : g,
          ),
        },
      });
    }
  };

  const editingNote =
    state.kind !== 'ready' || !editing
      ? null
      : editing.kind === 'match'
        ? state.vm.notes
        : (state.vm.detailGames.find((g) => g.id === editing.gameId)?.notes ??
          null);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/history');
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center gap-3 px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-elevated active:bg-surface"
        >
          <Icon name="chevron-left" size={18} className="text-ink-secondary" />
        </TouchableOpacity>
        <Text className="font-display-bold text-lg text-ink-primary">
          Match detail
        </Text>
      </View>

      {state.kind === 'ready' ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={resultStyle}>
            <ResultCard vm={state.vm} />
          </Animated.View>

          <Animated.View style={gamesStyle}>
            <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">
              Games
            </Text>
            <View className="gap-2.5">
              {state.vm.detailGames.map((g) => (
                <GameCard
                  key={g.n}
                  game={g}
                  onEditNote={(game) =>
                    setEditing({ kind: 'game', gameId: game.id, n: game.n })
                  }
                />
              ))}
            </View>
            {state.vm.missingTimelines && (
              <Text className="mt-2 px-1 text-[12px] leading-4 text-ink-tertiary">
                Score graphs are recorded for games played from now on.
              </Text>
            )}
          </Animated.View>

          <Animated.View style={deckStyle}>
            <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">
              Deck
            </Text>
            <DeckCard
              vm={state.vm}
              onOpen={(deckId) => router.push(`/decks/${deckId}`)}
            />
            {/* Match mode (SPEC Feature 8): the opponent's deck card goes here,
                then an "Opponent" section — linked profile, head-to-head,
                their win rate. */}

            <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">
              Notes
            </Text>
            <View className="rounded-2xl border border-border bg-surface px-4">
              <NoteRow
                label="Round notes"
                note={state.vm.notes}
                prompt="Add notes on the round"
                onPress={() => setEditing({ kind: 'match' })}
                lines={8}
              />
            </View>
          </Animated.View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          {state.kind === 'loading' ? (
            <Text className="text-sm text-ink-tertiary">Loading match…</Text>
          ) : (
            <>
              <Text className="text-center text-sm text-ink-secondary">
                {state.kind === 'missing'
                  ? "This match doesn't exist or isn't yours."
                  : "Couldn't load this match. Check your connection."}
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

      <NoteEditor
        visible={editing !== null}
        initial={editingNote}
        title={
          editing?.kind === 'game' ? `Game ${editing.n} note` : 'Round notes'
        }
        placeholder={
          editing?.kind === 'game'
            ? 'What happened this game? Mulligans, key turns, misplays…'
            : 'How did the round go? What would you change next time?'
        }
        onSave={saveNote}
        onClose={() => setEditing(null)}
      />
    </View>
  );
};

/** Result, opponent and format, the series/game score, date and clock. */
const ResultCard = ({ vm }: { vm: MatchDetailVM }) => {
  const r = RESULT[vm.result];
  return (
    <View className="flex-row overflow-hidden rounded-2xl border border-border bg-surface">
      <View className={`w-1 ${r.bar}`} />
      <View className="flex-1 p-4">
        <View className="flex-row items-center gap-3.5">
          <View
            className={`h-14 w-14 items-center justify-center rounded-xl ${r.badge}`}
          >
            <Text className={`font-display-bold text-2xl ${r.text}`}>
              {vm.letter}
            </Text>
          </View>
          <View className="flex-1">
            <Text className={`font-display-bold text-[26px] ${r.text}`}>
              {vm.title}
            </Text>
            <Text className="text-[13px] text-ink-secondary" numberOfLines={1}>
              vs {vm.opponent} · {vm.formatLong}
            </Text>
          </View>
          <Text className="font-mono text-[34px] text-ink-primary">
            {vm.score}
          </Text>
        </View>

        <View className="mt-3.5 flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <View className="flex-row items-center gap-1.5">
            <Icon name="calendar" size={13} className="text-ink-secondary" />
            <Text className="text-[13px] text-ink-secondary">
              {vm.dateLong}
            </Text>
          </View>
          {vm.timer && (
            <>
              <Text className="text-[13px] text-ink-tertiary">·</Text>
              <View className="flex-row items-center gap-1.5">
                <Icon name="clock" size={13} className="text-ink-secondary" />
                <Text className="text-[13px] text-ink-secondary">
                  played {vm.timer.played} of {vm.timer.limit}
                </Text>
                {vm.timer.overtime && (
                  <Text className="text-[13px] text-loss-text">· overtime</Text>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

/** The deck you played, linking to it — or a note that none was chosen. */
const DeckCard = ({
  vm,
  onOpen,
}: {
  vm: MatchDetailVM;
  onOpen: (deckId: string) => void;
}) => {
  if (!vm.deck) {
    return (
      <View className="rounded-2xl border border-dashed border-border px-4 py-4">
        <Text className="text-[14px] text-ink-secondary">
          No deck was chosen for this match.
        </Text>
      </View>
    );
  }
  const deck = vm.deck;
  return (
    <View className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-elevated">
        <Text className="font-display-bold text-[17px] text-ink-primary">
          {deck.name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-display text-[12px] text-accent">You played</Text>
        <Text
          className="mt-0.5 font-display-bold text-[16px] text-ink-primary"
          numberOfLines={1}
        >
          {deck.name}
        </Text>
      </View>
      {deck.deleted ? (
        <Text className="text-[13px] text-ink-tertiary">Deleted</Text>
      ) : (
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={`Open decklist ${deck.name}`}
          onPress={() => onOpen(deck.id)}
          className="h-11 flex-row items-center gap-1 pl-2"
        >
          <Text className="font-display text-[14px] text-accent">Decklist</Text>
          <Icon name="chevron-right" size={15} className="text-accent" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default MatchDetail;
