import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

type ScoringComponentProps = {
  playerId: PlayerId;
};

/**
 * The tappable score for one player: big mono numeral (tap to increment), the
 * read-only target caption, and a decrement circle directly under the number so
 * it stays within thumb reach on both halves (a bottom-pinned control ends up
 * under the Dynamic Island on the rotated opponent half). END lives separately
 * in TrackingField.
 */
const ScoringComponent = ({ playerId }: ScoringComponentProps) => {
  const { match, currentGame, incrementScore, decrementScore } = useMatch();

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
    <View className="items-center">
      <Pressable onPress={onIncrement} className="items-center active:opacity-80">
        <Text className="font-mono text-9xl leading-none text-ink-primary">
          {player.gameScore}
        </Text>
        <Text className="mt-2 text-base text-ink-secondary">
          target {currentGame?.targetScore ?? 0}
        </Text>
      </Pressable>

      <Pressable
        onPress={onDecrement}
        className="mt-8 h-14 w-14 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
      >
        <Text className="text-4xl leading-none text-ink-secondary">−</Text>
      </Pressable>
    </View>
  );
};

export default ScoringComponent;
