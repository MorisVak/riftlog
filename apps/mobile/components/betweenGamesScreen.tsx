import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

// Result tokens, paired with a letter so color is never the only signal.
const RESULT = {
  win: { letter: 'W', badge: 'bg-win-tint', text: 'text-win-text' },
  draw: { letter: 'D', badge: 'bg-draw-tint', text: 'text-draw-text' },
} as const;

/**
 * Bo3 interstitial shown when a game is frozen but the match isn't decided.
 * Reveals the just-finished game's result (letter badge + score), the running
 * series score, then starts the next game on confirm.
 */
const BetweenGamesScreen = () => {
  const { match, advanceGame } = useMatch();
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

  const onNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    advanceGame();
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
    </View>
  );
};

export default BetweenGamesScreen;
