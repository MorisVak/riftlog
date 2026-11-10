import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import { useAuth } from '@/contexts/authContext';
import { winsLabel } from '@/lib/playerText';
import type { Match } from '@riftlog/core';
import MatchClock from './matchClock';
import InlineNote from './match/inlineNote';
import VersusBanner from './match/versusBanner';
import Icon from './icon';
import { badgePop } from './transitions';
import React, { useEffect, useState } from 'react';
import { useAndroidBack } from '@/hooks/useAndroidBack';
import { glow as glowShadow } from '@/lib/glow';

// Result tokens, paired with a letter so color is never the only signal. The
// badge is read from p1's perspective — you — so the opponent taking a game is
// an `L` in loss red, not a `W` in win green. p1 is always the device owner.
const RESULT = {
  win: { letter: 'W', word: 'Won', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { letter: 'L', word: 'Lost', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { letter: 'D', word: 'Drawn', badge: 'bg-draw-tint', text: 'text-draw-text' },
} as const;
type Outcome = keyof typeof RESULT;

/** A decided game's result for you (p1): nobody took it = a draw. */
const outcomeOf = (winnerId: string | null | undefined): Outcome =>
  winnerId == null ? 'draw' : winnerId === 'p1' ? 'win' : 'loss';

// The live-cell breath from boardDivider.tsx, to the value: the "Start game"
// CTA is the one live thing on this screen, so it pulses the same way the game
// in progress does on the board. Kept as a style object rather than a
// `shadow-*` class — see the shadow note in CLAUDE.md.
const ACCENT_SOFT = '#A6ADE6';
const GLOW_MS = 2200;
const GLOW_MIN = 0.45;
const GLOW_MAX = 0.95;

/**
 * Confirm for ending the round early (the escape hatch a Bo3 needs when it has
 * to stop before it's naturally decided). A game has just been decided on this
 * screen, so the conclusion always yields a result — shown here so it's never a
 * stray tap. Mirrors the ExitConfirm overlay pattern in playField.tsx.
 */
const EndRoundConfirm = ({
  outcomeLabel,
  seriesLabel,
  onCancel,
  onConfirm,
}: {
  outcomeLabel: string;
  seriesLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <View className="absolute inset-0 items-center justify-center bg-background/80 px-8">
    <View className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6">
      <Text className="mb-1 text-center font-display-bold text-xl text-ink-primary">
        End round now?
      </Text>
      <Text className="mb-6 text-center text-sm text-ink-secondary">
        Recorded as {outcomeLabel} at {seriesLabel}.
      </Text>

      <Pressable
        onPress={onConfirm}
        className="mb-3 rounded-xl bg-accent px-5 py-4 active:bg-accent-strong"
      >
        <Text className="text-center font-display-bold text-base text-background">
          End round
        </Text>
      </Pressable>
      <Pressable onPress={onCancel} className="px-5 py-3">
        <Text className="text-center text-base font-medium text-ink-secondary">
          Keep playing
        </Text>
      </Pressable>
    </View>
  </View>
);

/**
 * The round so far: one slot per game of the Bo3 — decided games carry their
 * W/L/D letter on the result tint (the one just played pops in), the next is
 * outlined in the accent with a play mark, a game not reached yet is a hollow
 * outline — and the standing beside them.
 */
const SeriesTracker = ({ match }: { match: Match }) => {
  const [p1, p2] = match.players;
  return (
    <View className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3">
      <View className="flex-1">
        <Text className="font-display text-[13px] text-ink-secondary">Series</Text>
        <Text className="font-mono text-[26px] leading-8 text-ink-primary">
          {p1?.gameWins ?? 0}–{p2?.gameWins ?? 0}
        </Text>
      </View>
      <View className="flex-row gap-2.5">
        {Array.from({ length: match.bestOf }, (_, i) => {
          const game = match.games[i];
          const decided = game?.endedAt != null;
          const next = i === match.games.length;
          const r = RESULT[outcomeOf(game?.winnerId)];
          const label = `Game ${i + 1}: ${decided ? r.word.toLowerCase() : next ? 'next' : 'not played'}`;
          return (
            <View key={i} accessible accessibilityLabel={label} className="items-center">
              {decided ? (
                <Animated.View
                  entering={i === match.currentGameIndex ? badgePop() : undefined}
                  className={`h-11 w-11 items-center justify-center rounded-xl ${r.badge}`}
                >
                  <Text className={`font-display-bold text-lg ${r.text}`}>{r.letter}</Text>
                </Animated.View>
              ) : (
                <View
                  className={`h-11 w-11 items-center justify-center rounded-xl border-2 ${
                    next ? 'border-accent' : 'border-dashed border-border'
                  }`}
                >
                  {next && <Icon name="play" size={16} className="text-accent" />}
                </View>
              )}
              <Text
                className={`mt-1 font-display text-[11px] ${
                  next ? 'text-accent' : 'text-ink-tertiary'
                }`}
              >
                G{i + 1}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Bo3 interstitial shown when a game is frozen but the match isn't decided.
 * Built from the match detail's pieces, so the break already looks like the
 * record it becomes: the versus banner for the game just played (its loser
 * darkened, "Game 1 · Won" over its score), the series so far, a note for the
 * game while it's fresh, then the one live thing — "Start game N" — and the
 * escape hatch, "End round".
 */
const BetweenGamesScreen = () => {
  const { match, advanceGame, concludeMatch, setGameNote } = useMatch();
  const { status } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Sideways the column is too tall for the screen: the banner goes left,
  // everything else right.
  const landscape = width > height;
  // Android's back button doesn't drop out of the series: it asks "End
  // round now?" (and closes that question if it's open).
  useAndroidBack(() => setConfirmOpen((open) => !open));

  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: GLOW_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [glow]);
  const glowStyle = useAnimatedStyle(() =>
    glowShadow(ACCENT_SOFT, GLOW_MIN + glow.value * (GLOW_MAX - GLOW_MIN), 6 + glow.value * 8),
  );

  if (!match) return null;

  const [p1, p2] = match.players;
  const lastGame = match.games[match.currentGameIndex];
  const lastGameNumber = match.currentGameIndex + 1;
  const nextGameNumber = match.games.length + 1;

  // Scored against p1, who is always you.
  const outcome = outcomeOf(lastGame?.winnerId);
  const r = RESULT[outcome];
  const score = `${lastGame?.scoresAtEnd.p1 ?? 0}–${lastGame?.scoresAtEnd.p2 ?? 0}`;
  const winnerName = match.players.find((p) => p.id === lastGame?.winnerId)?.name ?? '';
  const headline =
    outcome === 'draw'
      ? `Game ${lastGameNumber} drawn`
      : `${winsLabel(winnerName)} game ${lastGameNumber}`;

  // What ending the round now would record, from the current series standings.
  const w1 = p1?.gameWins ?? 0;
  const w2 = p2?.gameWins ?? 0;
  const seriesLeader = w1 > w2 ? p1 : w2 > w1 ? p2 : null;
  const endOutcomeLabel = seriesLeader ? winsLabel(seriesLeader.name) : 'a draw';
  const seriesLabel = `${w1}–${w2}`;

  const onNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    advanceGame();
  };

  const onOpenConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmOpen(true);
  };

  const onConfirmEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmOpen(false);
    concludeMatch();
  };

  // Landscape: as tall as the screen allows, beside the actions. Portrait:
  // about a third of the screen, so the picture carries the moment.
  const bannerHeight = landscape
    ? Math.min(300, height - insets.top - insets.bottom - 48)
    : Math.round(Math.min(320, Math.max(216, height * 0.36)));

  const banner = (
    <VersusBanner
      you={{ name: p1?.name ?? 'You', legend: p1?.legend ?? null }}
      them={{ name: p2?.name ?? 'Opponent', legend: p2?.legend ?? null }}
      outcome={outcome}
      title={`Game ${lastGameNumber} · ${r.word}`}
      titleClass={r.text}
      score={score}
      height={bannerHeight}
      className="rounded-3xl border border-border"
      accessibilityLabel={`${headline}, ${score}. Series ${seriesLabel}.`}
    />
  );

  const actions = (
    <View className="items-center">
      {/* The glow sits on the wrapper, not the Pressable: an iOS shadow is cast
          from the view's own filled, rounded box, so it needs the accent fill
          and the pill radius. The Pressable inside paints only the pressed
          state over it. */}
      <Animated.View className="self-stretch rounded-full bg-accent" style={glowStyle}>
        <Pressable
          onPress={onNext}
          className="items-center rounded-full px-10 py-4 active:bg-accent-strong"
        >
          <Text className="font-display-bold text-lg text-background">
            Start game {nextGameNumber}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Escape hatch: end the round on the current standing (e.g. out of time). */}
      <Pressable onPress={onOpenConfirm} className="mt-2 px-6 py-2 active:opacity-70">
        <Text className="font-display-medium text-base text-ink-secondary">End round</Text>
      </Pressable>
    </View>
  );

  // Note the game while it's fresh. Signed-in only: a guest's match is never
  // saved, so a note would go nowhere. Written in place, like on the detail.
  const note = status === 'authed' && (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <InlineNote
        label={`Game ${lastGameNumber} note`}
        note={lastGame?.notes ?? null}
        placeholder="Mulligans, key turns, misplays…"
        onSave={async (text) => setGameNote(match.currentGameIndex, text)}
      />
    </View>
  );

  // Clear of the notch, whichever side it's on; the same on both sides so the
  // two clocks mirror each other.
  const side = Math.max(insets.left, insets.right) + 20;

  return (
    // The note field sits mid-screen: shift up for the keyboard, and a tap on
    // empty space ends editing (which saves the note).
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-background"
    >
      {/* The clock does not stop for the break — sideboarding is played on the
          same countdown — so it stays on screen. Twice over: the rotated copy
          reads right-way-up for the player across the table, the other for the
          player holding the phone. Both render nothing when untimed. */}
      {landscape ? (
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          className="flex-1 flex-row items-center gap-8"
          style={{ paddingLeft: side + 24, paddingRight: side + 24 }}
        >
          <MatchClock
            variant="screen"
            className="absolute top-4 rotate-180"
            style={{ right: side }}
          />
          <MatchClock variant="screen" className="absolute bottom-4" style={{ left: side }} />

          <View className="flex-1">{banner}</View>
          <View className="w-[340px] gap-4">
            <SeriesTracker match={match} />
            {note}
            {actions}
          </View>

          {confirmOpen && (
            <EndRoundConfirm
              outcomeLabel={endOutcomeLabel}
              seriesLabel={seriesLabel}
              onCancel={() => setConfirmOpen(false)}
              onConfirm={onConfirmEnd}
            />
          )}
        </Pressable>
      ) : (
        <Pressable
          accessible={false}
          onPress={Keyboard.dismiss}
          className="flex-1 px-5"
          style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}
        >
          {/* In the flow, not floating: nothing can sit under it. */}
          <MatchClock variant="screen" className="mb-3 rotate-180" />
          {banner}
          <View className="mt-4 gap-4">
            <SeriesTracker match={match} />
            {note}
          </View>
          {/* The button sits low, in thumb reach; the keyboard can squeeze
              this space away without moving the note. */}
          <View className="min-h-6 flex-1" />
          {actions}
          <MatchClock variant="screen" className="mt-2" />

          {confirmOpen && (
            <EndRoundConfirm
              outcomeLabel={endOutcomeLabel}
              seriesLabel={seriesLabel}
              onCancel={() => setConfirmOpen(false)}
              onConfirm={onConfirmEnd}
            />
          )}
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
};

export default BetweenGamesScreen;
