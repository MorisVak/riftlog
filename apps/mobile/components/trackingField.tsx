import { Text, View } from 'react-native';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import ScoringComponent from './scoringComponent';
import React from 'react';

type TrackingFieldProps = {
  playerId: PlayerId;
  className?: string;
};

const TrackingField = ({ playerId, className = '' }: TrackingFieldProps) => {
  const { match } = useMatch();
  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  return (
    <View className={`flex-1 items-center justify-center ${className}`}>
      <Text className="text-white mb-20">{player.name}</Text>
      <ScoringComponent playerId={playerId} />
    </View>
  );
};

export default TrackingField;
