import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

type ScoringComponentProps = {
  playerId: PlayerId;
};

const ScoringComponent = ({ playerId }: ScoringComponentProps) => {
  const { match, incrementScore, decrementScore } = useMatch();

  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  const onIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    incrementScore(playerId);
  };

  const onDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    decrementScore(playerId);
  };

  return (
    <View className="flex-row items-center gap-6">
      <TouchableOpacity
        onPress={onDecrement}
        className="h-16 w-16 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
      >
        <Text className="text-white text-4xl font-semibold">−</Text>
      </TouchableOpacity>

      <Text className="text-white text-8xl font-bold tabular-nums">
        {player.gameScore}
      </Text>

      <TouchableOpacity
        onPress={onIncrement}
        className="h-16 w-16 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
      >
        <Text className="text-white text-4xl font-semibold">+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ScoringComponent;
