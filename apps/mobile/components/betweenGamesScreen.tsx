import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import React, { useState } from 'react';

// Result tokens, paired with a letter so color is never the only signal.
const RESULT = {
  win: { letter: 'W', badge: 'bg-win-tint', text: 'text-win-text' },
  draw: { letter: 'D', badge: 'bg-draw-tint', text: 'text-draw-text' },
} as const;

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
  if (!match) return null;

  const [p1, p2] = match.players;
  const lastGame = match.games[match.currentGameIndex];
  const lastGameNumber = match.currentGameIndex + 1;
  const nextGameNumber = match.games.length + 1;

  // A frozen game with no winner is a draw; otherwise someone took it.
  const isDraw = lastGame?.winnerId == null;
  const r = isDraw ? RESULT.draw : RESULT.win;
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
      <Text className="font-display text-xs uppercase tracking-widest text-ink-secondary">
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

      <Pressable
        onPress={onNext}
        className="mt-12 rounded-full bg-accent px-10 py-4 active:bg-accent-strong"
      >
        <Text className="font-display-bold text-lg text-background">
          Start game {nextGameNumber}
        </Text>
      </Pressable>

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
