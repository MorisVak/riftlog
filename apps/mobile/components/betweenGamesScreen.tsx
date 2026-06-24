import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

/**
 * Bo3 interstitial shown when a game is frozen but the match isn't decided.
 * Displays the running match score and starts the next game on confirm.
 */
const BetweenGamesScreen = () => {
  const { match, advanceGame } = useMatch();
  if (!match) return null;

  const [p1, p2] = match.players;
  const gameNumber = match.games.length + 1;

  const onNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    advanceGame();
  };

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text className="mb-2 text-sm font-medium uppercase tracking-widest text-ink-secondary">
        Match score
      </Text>

      <View className="mb-2 flex-row items-center">
        <Text className="text-7xl font-bold tabular-nums text-ink-primary">
          {p1?.gameWins ?? 0}
        </Text>
        <Text className="mx-4 text-5xl font-light text-ink-tertiary">–</Text>
        <Text className="text-7xl font-bold tabular-nums text-ink-primary">
          {p2?.gameWins ?? 0}
        </Text>
      </View>

      <View className="mb-12 flex-row items-center gap-6">
        <Text className="text-base text-ink-secondary">
          {p1?.name ?? 'Player 1'}
        </Text>
        <Text className="text-base text-ink-secondary">
          {p2?.name ?? 'Player 2'}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onNext}
        className="rounded-xl bg-accent px-10 py-4 active:bg-accent-strong"
      >
        <Text className="text-lg font-bold text-background">
          Start game {gameNumber}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default BetweenGamesScreen;
