import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import ScoringComponent from './scoringComponent';
import MatchClock from './matchClock';
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  const endPill = onEnd && (
    <Pressable
      onPress={onEnd}
      className={`h-11 flex-row items-center gap-2 rounded-full bg-accent px-6 shadow-accent-btn active:bg-accent-strong ${
        landscape ? '' : 'absolute bottom-8'
      }`}
    >
      <Feather name="check" size={17} color={ON_ACCENT} />
      <Text className="font-display-bold text-base text-background">END</Text>
    </Pressable>
  );

  if (landscape) {
    // The players sit at the long sides, so each half faces its player: the
    // name in one corner, and their own copy of the clock in the other — a
    // single clock on the divider can only face one of them. Both halves use
    // the wider side inset so they stay mirror images, clear of the notch.
    const side = Math.max(insets.left, insets.right) + 20;
    return (
      <View className={`flex-1 items-center justify-center ${className}`}>
        <Text
          style={{ left: side }}
          className="absolute font-display-medium text-sm text-ink-secondary"
        >
          {player.name}
        </Text>

        <ScoringComponent playerId={playerId} />

        <View style={{ right: side }} className="absolute items-center gap-3">
          {match?.timeLimitSeconds != null && (
            <View
              className={`rounded-2xl border-2 bg-elevated px-3 py-1 ${
                match.clockPausedAt != null
                  ? 'border-accent'
                  : 'border-ink-tertiary'
              }`}
            >
              <MatchClock variant="board" />
            </View>
          )}
          {endPill}
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 items-center justify-center ${className}`}>
      <Text className="absolute top-5 font-display-medium text-sm text-ink-secondary">
        {player.name}
      </Text>

      <ScoringComponent playerId={playerId} />

      {/* END pinned to the bottom edge of the active player's half, per the
          design — a wide accent pill with a checkmark. The opponent half has no
          END, so nothing sits behind the Dynamic Island up top. */}
      {endPill}
    </View>
  );
};

export default TrackingField;
