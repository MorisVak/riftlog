import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import MatchClock from './matchClock';
import React, { useEffect, useState } from 'react';

// Result tokens, paired with a letter so color is never the only signal. The
// badge is read from p1's perspective — you — so the opponent taking a game is
// an `L` in loss red, not a `W` in win green. p1 is always the device owner.
const RESULT = {
  win: { letter: 'W', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { letter: 'L', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { letter: 'D', badge: 'bg-draw-tint', text: 'text-draw-text' },
} as const;

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
 * Bo3 interstitial shown when a game is frozen but the match isn't decided.
 * Reveals the just-finished game's result (letter badge + score), the running
 * series score, then starts the next game on confirm.
 */
const BetweenGamesScreen = () => {
  const { match, advanceGame, concludeMatch } = useMatch();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: GLOW_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: ACCENT_SOFT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: GLOW_MIN + glow.value * (GLOW_MAX - GLOW_MIN),
    shadowRadius: 6 + glow.value * 8,
  }));

  if (!match) return null;

  const [p1, p2] = match.players;
  const lastGame = match.games[match.currentGameIndex];
  const lastGameNumber = match.currentGameIndex + 1;
  const nextGameNumber = match.games.length + 1;

  // A frozen game with no winner is a draw; otherwise someone took it — and
  // "someone" is scored against p1, who is always you.
  const isDraw = lastGame?.winnerId == null;
  const r = isDraw
    ? RESULT.draw
    : lastGame?.winnerId === 'p1'
      ? RESULT.win
      : RESULT.loss;
  const winnerName =
    match.players.find((p) => p.id === lastGame?.winnerId)?.name ?? null;

  const headline = isDraw
    ? `Game ${lastGameNumber} drawn`
    : `${winnerName} wins game ${lastGameNumber}`;

  // What ending the round now would record, from the current series standings.
  const w1 = p1?.gameWins ?? 0;
  const w2 = p2?.gameWins ?? 0;
  const seriesLeader = w1 > w2 ? p1 : w2 > w1 ? p2 : null;
  const endOutcomeLabel = seriesLeader ? `${seriesLeader.name} wins` : 'a draw';
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

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      {/* The clock does not stop for the break — sideboarding is played on the
          same countdown — so it stays on screen here. Twice over: the rotated
          copy up top reads right-way-up for the player across the table, the
          lower one for the player holding the phone. Both render nothing when
          the match is untimed. */}
      <MatchClock variant="screen" className="absolute inset-x-0 top-16 rotate-180" />
      <MatchClock variant="screen" className="absolute inset-x-0 bottom-10" />

      <Text className="font-display text-2xl uppercase tracking-widest text-ink-secondary">
        Game {lastGameNumber}
      </Text>

      {/* Result badge — colored fill + letter, never color alone. */}
      <View
        className={`mt-6 h-20 w-20 items-center justify-center rounded-3xl ${r.badge}`}
      >
        <Text className={`font-display-bold text-4xl ${r.text}`}>
          {r.letter}
        </Text>
      </View>

      <Text className="mt-5 text-center font-display-bold text-xl text-ink-primary">
        {headline}
      </Text>

      <Text className="mt-2 font-mono text-5xl text-ink-primary">
        {lastGame?.scoresAtEnd.p1 ?? 0}–{lastGame?.scoresAtEnd.p2 ?? 0}
      </Text>

      <Text className="mt-2 text-sm text-ink-secondary">
        Series {p1?.gameWins ?? 0}–{p2?.gameWins ?? 0}
      </Text>

      {/* The glow sits on the wrapper, not the Pressable: an iOS shadow is cast
          from the view's own filled, rounded box, so it needs the accent fill
          and the pill radius. The Pressable inside paints only the pressed
          state over it. */}
      <Animated.View className="mt-12 rounded-full bg-accent" style={glowStyle}>
        <Pressable
          onPress={onNext}
          className="rounded-full px-10 py-4 active:bg-accent-strong"
        >
          <Text className="font-display-bold text-lg text-background">
            Start game {nextGameNumber}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Escape hatch: end the round on the current standing (e.g. out of time). */}
      <Pressable onPress={onOpenConfirm} className="mt-5 px-6 py-2 active:opacity-70">
        <Text className="font-display-medium text-base text-ink-secondary">
          End round
        </Text>
      </Pressable>

      {confirmOpen && (
        <EndRoundConfirm
          outcomeLabel={endOutcomeLabel}
          seriesLabel={seriesLabel}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={onConfirmEnd}
        />
      )}
    </View>
  );
};

export default BetweenGamesScreen;
