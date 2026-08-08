import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import TrackingField from './trackingField';
import EndGamePrompt from './endGamePrompt';
import MatchClock from './matchClock';
import BoardDivider from './boardDivider';
import React, { useState } from 'react';

/**
 * Lightweight confirm shown when the player taps the board's exit (✕). Exiting
 * discards the in-progress match (no persistence yet), so it's guarded to avoid
 * losing a live game to a stray tap. Mirrors the EndGamePrompt overlay pattern.
 */
const ExitConfirm = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <View className="absolute inset-0 items-center justify-center bg-background/80 px-8">
    <View className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6">
      <Text className="mb-1 text-center font-display-bold text-xl text-ink-primary">
        Exit match?
      </Text>
      <Text className="mb-6 text-center text-sm text-ink-secondary">
        This match isn&apos;t saved yet — exiting discards it.
      </Text>

      <Pressable
        onPress={onConfirm}
        className="mb-3 rounded-xl bg-loss px-5 py-4 active:opacity-90"
      >
        <Text className="text-center font-display-bold text-base text-background">
          Exit and discard
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
 * Width the clock capsule is laid out at *before* it's rotated — rotation is a
 * paint transform, so without an explicit width the clock would lay out inside
 * its narrow slot and truncate ("50:00" → "2…"). After the quarter turn this
 * becomes the capsule's height on screen.
 */
const CLOCK_W = 168;

/**
 * Height of the invisible overlay strip centered on the divider. It only needs
 * to clear the rotated clock capsule; it's `box-none` so the player halves
 * underneath keep taking taps.
 */
const OVERLAY_H = CLOCK_W + 12;

// ink-secondary and accent tokens — Feather takes a raw color prop, not a
// className.
const INK_SECONDARY = '#868FB0';
const ACCENT = '#8B93D9';

/**
 * Shadows here are plain RN style objects, NOT NativeWind `shadow-*` classes.
 * Those are parsed at render time, and on this stack (expo-router + NativeWind)
 * that has been implicated in spurious "Couldn't find a navigation context"
 * errors — which is exactly what the shadowed elements on this screen threw.
 * Values mirror the design tokens.
 *
 * Mirrors the `accent-btn` glow the END pill and Start CTA carry.
 */
const ACCENT_GLOW = {
  shadowColor: ACCENT,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
} as const;

/**
 * The same glow for the paused clock, so the capsule and its control light up
 * together. The offset is symmetric because the capsule is quarter-turned — a
 * downward offset would rotate with it and cast sideways.
 */
const CLOCK_GLOW = {
  ...ACCENT_GLOW,
  shadowOffset: { width: 0, height: 0 },
} as const;

const PlayField = () => {
  const { match, endMatch, pauseClock, resumeClock } = useMatch();
  const [promptOpen, setPromptOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  if (!match) return null;

  const timed = match.timeLimitSeconds != null;
  const paused = match.clockPausedAt != null;

  const toggleClock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (paused) resumeClock();
    else pauseClock();
  };

  const openEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPromptOpen(true);
  };

  const openExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExitOpen(true);
  };

  const confirmExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExitOpen(false);
    endMatch();
  };

  return (
    <View className="flex-1">
      <TrackingField className="rotate-180" playerId="p2" />

      {/* The halves are separated by a line, not a band — the Bo3 series pips
          live inside it (see BoardDivider). */}
      <BoardDivider />

      <TrackingField playerId="p1" onEnd={openEnd} />

      {/* Clock and controls float over the divider instead of sitting in a bar,
          so neither player loses board space to them. `box-none` lets taps
          through to the halves everywhere except on the buttons themselves. */}
      <View
        pointerEvents="box-none"
        // Asymmetric padding, not `px-4`: the clock + pause sit ~10px further
        // left, and the exit ~10px further in from the right edge, which is
        // what balances the two sides by eye.
        style={{
          height: OVERLAY_H,
          marginTop: -OVERLAY_H / 2,
          paddingLeft: 0,
          paddingRight: 26,
        }}
        className="absolute inset-x-0 top-1/2 flex-row items-center justify-between"
      >
        {/* Left of the board at the table's midline, quarter-turned so neither
            player reads it upside down, on a shadowed capsule that lifts it off
            the play field. Renders nothing when the match is untimed. */}
        {/* Nudged past the strip's left edge — the clock capsule is centered in
            a slot wider than itself, so this pulls the visible capsule and the
            pause button out to where they balance the exit on the right. */}
        <View className="flex-row items-center gap-2" style={{ marginLeft: -4 }}>
          <View pointerEvents="none" className="w-24 items-center justify-center">
            <View
              style={[
                { width: CLOCK_W, transform: [{ rotate: '-90deg' }] },
                timed && paused ? CLOCK_GLOW : null,
              ]}
              className={
                timed
                  ? `items-center rounded-2xl border-2 bg-elevated px-3 py-2 ${
                      paused ? 'border-accent' : 'border-ink-tertiary'
                    }`
                  : undefined
              }
            >
              <MatchClock variant="board" />
            </View>
          </View>

          {/* Sits with the clock it controls, not with the exit: stop the clock
              for an interruption, resume when play restarts. */}
          {timed && (
            <Pressable
              onPress={toggleClock}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume clock' : 'Pause clock'}
              style={paused ? ACCENT_GLOW : undefined}
              className={`h-12 w-12 items-center justify-center rounded-xl border-2 ${
                paused
                  ? 'border-accent bg-elevated'
                  : 'border-ink-tertiary bg-elevated active:bg-border'
              }`}
            >
              <Feather
                name={paused ? 'play' : 'pause'}
                size={19}
                color={paused ? ACCENT : INK_SECONDARY}
              />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={openExit}
          className="h-12 w-12 items-center justify-center rounded-xl border-2 border-ink-tertiary bg-elevated active:bg-border"
        >
          <Text className="text-2xl leading-none text-ink-secondary">✕</Text>
        </Pressable>
      </View>

      {promptOpen && <EndGamePrompt onClose={() => setPromptOpen(false)} />}
      {exitOpen && (
        <ExitConfirm
          onCancel={() => setExitOpen(false)}
          onConfirm={confirmExit}
        />
      )}
    </View>
  );
};

export default PlayField;
