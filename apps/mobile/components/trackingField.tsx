import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { CardRef, PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import { LinearGradient } from 'expo-linear-gradient';
import ScoringComponent from './scoringComponent';
import MatchClock from './matchClock';
import { LegendPortrait } from './deck/cardArt';
import React from 'react';
import { CTA_GLOW } from '@/components/ctaGlow';

// Feather icon color is a prop, not a className — raw value mirrors the
// `background` token (#0D1B2A), the ink color used on the accent pill.
const ON_ACCENT = '#0D1B2A';
// `background` mirrored for the gradient stops: a vignette over the legend
// art, darker toward the divider and the outer edge where text sits.
const VIGNETTE = ['#0D1B2AD9', '#0D1B2A66', '#0D1B2AD9'] as const;

// Landscape: the art fades out toward the score (clear → the background).
const SIDE_FADE = ['#0D1B2A00', '#0D1B2A1A', '#0D1B2AF5'] as const;

/**
 * The player's legend behind their half: dimmed and vignetted, so the score,
 * the buttons and the name stay the focus. Turns with the half, so it faces
 * its player too. Nothing when the player has no legend (or no art).
 *
 * Sideways each half is a wide, short strip: art covering all of it was
 * zoomed far past the image's resolution (blurry, the face cut off). There
 * it's a panel on the player's own side, behind their name, fading toward
 * the score — about portrait-shaped, so the face fits and stays sharp.
 */
const LegendBackground = ({
  player,
  landscape,
}: {
  player: { legend?: CardRef };
  landscape: boolean;
}) =>
  !player.legend ? null : landscape ? (
    <View pointerEvents="none" className="absolute bottom-0 left-0 top-0 w-[44%]">
      <LegendPortrait card={player.legend} />
      <View className="absolute inset-0 bg-background/30" />
      <LinearGradient
        colors={SIDE_FADE}
        locations={[0, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  ) : (
    <View pointerEvents="none" className="absolute inset-0">
      <LegendPortrait card={player.legend} />
      <View className="absolute inset-0 bg-background/45" />
      <LinearGradient
        colors={VIGNETTE}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
    </View>
  );

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

  // Behind everything on the half: the legend.
  const backdrop = (
    <>
      <LegendBackground player={player} landscape={landscape} />
    </>
  );
  // The player's name, larger, on a soft pill so it reads over the art.
  const nameTag = (
    <View className="rounded-full bg-background/70 px-3.5 py-1.5">
      <Text className="font-display-bold text-[17px] text-ink-primary" numberOfLines={1}>
        {player.name}
      </Text>
    </View>
  );

  const endPill = onEnd && (
    <Pressable
      onPress={onEnd}
      style={CTA_GLOW}
      className={`h-11 flex-row items-center gap-2 rounded-full bg-accent px-6 active:bg-accent-strong ${
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
      <View className={`flex-1 items-center justify-center overflow-hidden ${className}`}>
        {backdrop}
        <View style={{ left: side }} className="absolute">
          {nameTag}
        </View>

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
    <View className={`flex-1 items-center justify-center overflow-hidden ${className}`}>
      {backdrop}
      <View className="absolute top-4">{nameTag}</View>

      <ScoringComponent playerId={playerId} />

      {/* END pinned to the bottom edge of the active player's half, per the
          design — a wide accent pill with a checkmark. The opponent half has no
          END, so nothing sits behind the Dynamic Island up top. */}
      {endPill}
    </View>
  );
};

export default TrackingField;
