import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import TrackingField from './trackingField';
import EndGamePrompt from './endGamePrompt';
import MatchClock from './matchClock';
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
 * Height of the center band on a timed match. The clock is quarter-turned, so
 * the band's height is what caps the clock's text: this fits `+MM:SS` — the
 * longest the clock ever gets, in overtime — at the `board` variant's size.
 * Grow both together or the clock will clip.
 */
const BAND_H = 148;

/**
 * Width the clock is laid out at *before* it's rotated — rotation is a paint
 * transform, so without this the clock would lay out inside its narrow slot and
 * truncate ("50:00" → "2…"). After the quarter turn this width becomes the
 * clock's vertical extent, hence its relation to BAND_H.
 */
const CLOCK_W = BAND_H - 8;

const PlayField = () => {
  const { match, endMatch } = useMatch();
  const [promptOpen, setPromptOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  if (!match) return null;

  const timed = match.timeLimitSeconds != null;
  const gameNo = match.currentGameIndex + 1;
  const formatLabel = match.bestOf === 1 ? 'BO1' : 'BO3';
  // One pip per game in the format; filled once that slot has been decided.
  const decided = match.players.reduce((n, p) => n + p.gameWins, 0);
  const pips = Array.from({ length: match.bestOf }, (_, i) => i < decided);

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

      {/* Center control bar: clock · format/game/pips · exit. Pass-turn is
          deferred.

          A timed match trades board height for a readable clock: the band grows
          to BAND_H so the quarter-turned clock has room to be big — rotating it
          means the band's HEIGHT is what limits the text's length, so the two
          sizes move together. An untimed match keeps the compact bar rather
          than leaving a tall empty strip. */}
      <View
        style={timed ? { height: BAND_H } : undefined}
        className={`flex-row items-center gap-3 border-y border-border bg-surface px-4 ${
          timed ? '' : 'py-4'
        }`}
      >
        {/* Left of the board, at the table's midline, rotated so neither player
            reads it upside down. Renders nothing when untimed, but the slot
            keeps its width so the format label stays centered either way. */}
        <View className="h-full w-20 items-center justify-center">
          <View style={{ width: CLOCK_W, transform: [{ rotate: '-90deg' }] }}>
            <MatchClock variant="board" />
          </View>
        </View>

        <View className="flex-1 items-center">
          <Text className="font-display text-base tracking-wide text-ink-primary">
            {formatLabel} · GAME {gameNo}
          </Text>
          {match.bestOf > 1 && (
            <View className="mt-2 flex-row gap-2">
              {pips.map((filled, i) => (
                <View
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${filled ? 'bg-accent' : 'bg-border'}`}
                />
              ))}
            </View>
          )}
        </View>

        {/* Same width as the clock slot, so the format label stays centered on
            the board rather than being pushed off by the wider left slot. */}
        <View className="w-20 items-center justify-center">
          <Pressable
            onPress={openExit}
            className="h-12 w-12 items-center justify-center rounded-xl bg-elevated active:bg-border"
          >
            <Text className="text-2xl leading-none text-ink-secondary">✕</Text>
          </Pressable>
        </View>
      </View>

      <TrackingField playerId="p1" onEnd={openEnd} />

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
