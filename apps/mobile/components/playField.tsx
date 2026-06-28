import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import TrackingField from './trackingField';
import EndGamePrompt from './endGamePrompt';
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

const PlayField = () => {
  const { match, endMatch } = useMatch();
  const [promptOpen, setPromptOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  if (!match) return null;

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

      {/* Center control bar: exit · format/game/pips. Pass-turn is deferred. */}
      <View className="flex-row items-center gap-3 border-y border-border bg-surface px-4 py-4">
        <Pressable
          onPress={openExit}
          className="h-12 w-12 items-center justify-center rounded-xl bg-elevated active:bg-border"
        >
          <Text className="text-2xl leading-none text-ink-secondary">✕</Text>
        </Pressable>

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

        {/* Spacer keeps the label centered (Pass button is deferred). */}
        <View className="h-12 w-12" />
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
