import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import ScoringComponent from './scoringComponent';
import React from 'react';

// Feather icon color is a prop, not a className — raw value mirrors the
// `background` token (#0D1B2A), the ink color used on the accent pill.
const ON_ACCENT = '#0D1B2A';

type TrackingFieldProps = {
  playerId: PlayerId;
  className?: string;
  /** Shows the END pill on this half (the active player's side). */
  onEnd?: () => void;
};

const TrackingField = ({
  playerId,
  className = '',
  onEnd,
}: TrackingFieldProps) => {
  const { match } = useMatch();
  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  return (
    <View className={`flex-1 items-center justify-center ${className}`}>
      <Text className="absolute top-5 font-display-medium text-sm text-ink-secondary">
        {player.name}
      </Text>

      <ScoringComponent playerId={playerId} />


      {/* END pinned to the bottom edge of the active player's half, per the
          design — a wide accent pill with a checkmark. The opponent half has no
          END, so nothing sits behind the Dynamic Island up top. */}
      {onEnd && (
        <Pressable
          onPress={onEnd}
          className="absolute bottom-8 h-11 flex-row items-center gap-2 rounded-full bg-accent px-6 shadow-accent-btn active:bg-accent-strong"
        >
          <Feather name="check" size={17} color={ON_ACCENT} />
          <Text className="font-display-bold text-base text-background">END</Text>
        </Pressable>
      )}
    </View>
  );
};

export default TrackingField;
