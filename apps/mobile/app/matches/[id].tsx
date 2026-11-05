import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchMatch,
  updateGameNote,
  updateMatchNote,
} from '@/lib/matchPersistence';
import { splitCardName, type CardRef } from '@riftlog/core';
import { toMatchDetailVM, type MatchDetailVM } from '@/lib/matchDetailView';
import { deckHref, type HistoryDeckVM, type Result } from '@/lib/historyView';
import GameCard from '@/components/match/gameCard';
import InlineNote from '@/components/match/inlineNote';
import Icon from '@/components/icon';
import { CardBackdrop, LegendPortrait } from '@/components/deck/cardArt';
import { playIntro, useRise } from '@/hooks/useScreenIntro';

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
  // screen keeps what was stored. Errors reach the field, which says so.
  const saveMatchNote = async (text: string) => {
    if (state.kind !== 'ready') return;
    const notes = await updateMatchNote(state.vm.id, text);
    setState((cur) => (cur.kind === 'ready' ? { kind: 'ready', vm: { ...cur.vm, notes } } : cur));
  };
  const saveGameNote = async (gameId: string, text: string) => {
    const notes = await updateGameNote(gameId, text);
    setState((cur) =>
      cur.kind === 'ready'
        ? {
            kind: 'ready',
            vm: {
              ...cur.vm,
              detailGames: cur.vm.detailGames.map((g) => (g.id === gameId ? { ...g, notes } : g)),
            },
          }
        : cur,
    );
  };

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
          // Notes are written in place at the bottom: keep the field above
          // the keyboard; a tap anywhere else or a drag dismisses it, which
          // saves the note (the default keyboardShouldPersistTaps).
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* A tap on empty space ends editing a note (which saves it) — even
              with a hardware keyboard, where there's no keyboard to dismiss. */}
          <Pressable accessible={false} onPress={Keyboard.dismiss}>
            <Animated.View style={resultStyle}>
              <ResultCard vm={state.vm} />
            </Animated.View>

            <Animated.View style={gamesStyle}>
              <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">
                Games
              </Text>
              <View className="overflow-hidden rounded-2xl border border-border bg-surface">
                {state.vm.detailGames.map((g, i) => (
                  <GameCard key={g.n} game={g} first={i === 0} />
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
                onOpen={(deck) => router.push(deckHref(deck))}
              />
              {/* Match mode (SPEC Feature 8): the opponent's deck card goes here,
                  then an "Opponent" section — linked profile, head-to-head,
                  their win rate. */}

              <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">
                Notes
              </Text>
              {/* Written in place. A Bo1 has a round note only — its one game is
                  the round — unless an older game note exists. */}
              <View className="overflow-hidden rounded-2xl border border-border bg-surface">
                <InlineNote
                  label="Round"
                  note={state.vm.notes}
                  placeholder="How did the round go?"
                  onSave={saveMatchNote}
                />
                {state.vm.detailGames
                  .filter((g) => state.vm.format === 'BO3' || g.notes)
                  .map((g) => (
                    <View key={g.id} className="border-t border-border/60">
                      <InlineNote
                        label={`Game ${g.n}`}
                        note={g.notes}
                        onSave={(text) => saveGameNote(g.id, text)}
                      />
                    </View>
                  ))}
              </View>
            </Animated.View>
          </Pressable>
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

    </View>
  );
};

// `background` (tailwind.config.js), mirrored for gradient stops (they can't
// take a class): clear → nearly opaque, for the banner's bottom shade.
const SHADE = ['#0D1B2A00', '#0D1B2A99', '#0D1B2AF7'] as const;
const BANNER_H = 216;
/** The slant of the cut between the two sides. */
const CUT = '-11deg';

/**
 * One side of the versus banner: the legend's art (face crop), or a quiet
 * silhouette when unknown, darkened when this side lost.
 */
const BannerArt = ({ legend, lost }: { legend: CardRef | null; lost: boolean }) => (
  <>
    {legend ? (
      <LegendPortrait card={legend} />
    ) : (
      <View className="absolute inset-0 items-center justify-center bg-elevated">
        <Icon name="user" size={40} className="text-border" />
      </View>
    )}
    {lost && <View className="absolute inset-0 bg-background/60" />}
  </>
);

/** A side's names in its bottom corner: the champion, then the player. */
const BannerName = ({
  name,
  legend,
  align,
}: {
  name: string;
  legend: CardRef | null;
  align: 'left' | 'right';
}) => (
  <View className={`flex-1 ${align === 'right' ? 'items-end' : ''}`}>
    <Text className="font-display-bold text-[18px] text-ink-primary" numberOfLines={1}>
      {legend ? splitCardName(legend.name).head : 'No legend'}
    </Text>
    <Text className="text-[13px] text-ink-secondary" numberOfLines={1}>
      {name}
    </Text>
  </View>
);

/**
 * The match as a versus banner, edge to edge: your legend on the left (you're
 * p1), theirs on the right, meeting at a slanted cut. The side that lost is
 * darkened, so the result reads in the picture too (a draw darkens neither);
 * the result word in its color, the score, and both sides' names sit along
 * the bottom. Format, date and clock follow as one quiet line.
 *
 * The cut needs no mask: the right side's box is skewed (clipping its art to
 * a parallelogram) and the art inside is skewed back, so it stays upright.
 */
const ResultCard = ({ vm }: { vm: MatchDetailVM }) => {
  const r = RESULT[vm.result];
  const youLost = vm.result === 'loss';
  const theyLost = vm.result === 'win';
  return (
    <View>
      <View
        accessible
        accessibilityLabel={`${vm.title}, ${vm.score}. ${vm.you} with ${
          vm.yourLegend?.name ?? 'no legend'
        } versus ${vm.opponent} with ${vm.opponentLegend?.name ?? 'no legend'}`}
        style={{ height: BANNER_H }}
        className="-mx-4 overflow-hidden bg-background"
      >
        {/* Yours: the left side, running under theirs at the cut. */}
        <View className="absolute bottom-0 left-0 top-0 w-[60%]">
          <BannerArt legend={vm.yourLegend} lost={youLost} />
        </View>

        {/* Theirs: a skewed box (the slanted cut), art skewed back upright. */}
        <View
          style={{ transform: [{ skewX: CUT }] }}
          className="absolute bottom-0 left-[50%] right-[-20%] top-0 overflow-hidden border-l-2 border-background"
        >
          <View
            style={{ transform: [{ skewX: CUT.replace('-', '') }] }}
            className="absolute bottom-0 left-[-12%] right-[8%] top-0"
          >
            <BannerArt legend={vm.opponentLegend} lost={theyLost} />
          </View>
        </View>

        <LinearGradient
          colors={SHADE}
          locations={[0.35, 0.68, 1]}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />

        {/* Along the bottom: you · result and score · them. */}
        <View className="absolute bottom-0 left-0 right-0 flex-row items-end gap-3 px-4 pb-3.5">
          <BannerName name={vm.you} legend={vm.yourLegend} align="left" />
          <View className="items-center">
            <Text className={`font-display-bold text-[15px] ${r.text}`}>{vm.title}</Text>
            <Text className="font-mono text-[36px] leading-[40px] text-ink-primary">
              {vm.score}
            </Text>
          </View>
          <BannerName name={vm.opponent} legend={vm.opponentLegend} align="right" />
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Text className="text-[13px] text-ink-secondary">{vm.formatLong}</Text>
        <Text className="text-[13px] text-ink-tertiary">·</Text>
        <Text className="text-[13px] text-ink-secondary">{vm.dateLong}</Text>
        {vm.timer && (
          <>
            <Text className="text-[13px] text-ink-tertiary">·</Text>
            <Text className="text-[13px] text-ink-secondary">
              played {vm.timer.played} of {vm.timer.limit}
            </Text>
            {vm.timer.overtime && <Text className="text-[13px] text-loss-text">· overtime</Text>}
          </>
        )}
      </View>
    </View>
  );
};

/**
 * The deck you played, linking to its list AS PLAYED (the pinned version) —
 * or a note that none was chosen. Says so when the deck was edited since.
 */
const DeckCard = ({
  vm,
  onOpen,
}: {
  vm: MatchDetailVM;
  onOpen: (deck: HistoryDeckVM) => void;
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
  // The whole card opens the list as played; deleted since: named, not linked.
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open decklist ${deck.name}`}
      disabled={deck.deleted}
      onPress={() => onOpen(deck)}
      className="relative min-h-[64px] flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-80"
    >
      {vm.yourLegend && <CardBackdrop card={vm.yourLegend} />}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-shrink font-display-bold text-[17px] text-ink-primary" numberOfLines={1}>
            {deck.name}
          </Text>
          {deck.edited && (
            <View className="rounded-full bg-background/70 px-2 py-0.5">
              <Text className="font-display text-[11px] text-ink-secondary">Older version</Text>
            </View>
          )}
        </View>
        {vm.yourLegend && (
          <Text className="text-[13px] text-ink-secondary" numberOfLines={1}>
            {vm.yourLegend.name}
          </Text>
        )}
      </View>
      {deck.deleted ? (
        <View className="rounded-md bg-background/70 px-2 py-1">
          <Text className="text-[12px] text-ink-tertiary">Deleted</Text>
        </View>
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-background/70">
          <Icon name="chevron-right" size={16} className="text-ink-primary" />
        </View>
      )}
    </Pressable>
  );
};;

export default MatchDetail;
