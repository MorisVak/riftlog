import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { splitCardName, type CardRef, type Player } from '@riftlog/core';
import type { GameResult } from '@/contexts/matchContext';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';
import Animated from 'react-native-reanimated';
import { LegendPortrait } from './deck/cardArt';
import PressOverlay from './pressOverlay';
import { BACKDROP_ENTER, BACKDROP_EXIT, POPUP_ENTER, POPUP_EXIT } from './transitions';

// `background` mirrored for the gradient stops: a shade under the names.
const SHADE = ['#0D1B2A00', '#0D1B2ACC', '#0D1B2AF7'] as const;

type EndGamePromptProps = {
  onClose: () => void;
};

/**
 * A player as a tile to tap: their legend (face crop, as in setup and the
 * versus banners), champion and name along the bottom, the score they're on
 * in the corner. The frame carries the result the tap records for p1 — you —
 * green for your side, red for theirs, so the outcome shows before the tap
 * (the question says it too, so color isn't the only signal).
 */
const WinnerTile = ({
  player,
  result,
  onPress,
}: {
  player: Player | undefined;
  result: 'win' | 'loss';
  onPress: () => void;
}) => {
  const name = player?.name ?? (result === 'win' ? 'You' : 'Opponent');
  const legend: CardRef | null = player?.legend ?? null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} won`}
      onPress={onPress}
      className={`relative h-56 flex-1 overflow-hidden rounded-2xl border-2 bg-surface ${
        result === 'win' ? 'border-win/60' : 'border-loss/60'
      }`}
    >
      {({ pressed }) => (
        <>
          {legend ? (
            <LegendPortrait card={legend} />
          ) : (
            <View className="absolute inset-0 items-center justify-center">
              <Text className="font-display-bold text-[72px] text-border">
                {name.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <LinearGradient
            colors={SHADE}
            locations={[0.4, 0.72, 1]}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />

          <View className="absolute right-2 top-2 min-w-[36px] items-center rounded-lg bg-background/75 px-2 py-0.5">
            <Text className="font-mono text-[20px] text-ink-primary">
              {player?.gameScore ?? 0}
            </Text>
          </View>

          <View className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            {legend && (
              <Text className="font-display-bold text-[18px] text-ink-primary" numberOfLines={1}>
                {splitCardName(legend.name).head}
              </Text>
            )}
            <Text
              className={
                legend
                  ? 'text-[13px] text-ink-secondary'
                  : 'font-display-bold text-[18px] text-ink-primary'
              }
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
          <PressOverlay pressed={pressed} />
        </>
      )}
    </Pressable>
  );
};

/**
 * Confirm overlay shown when the player taps END. Guards against accidental
 * taps (nothing auto-ends) and captures who won the game — or a draw: tap the
 * winner's tile. On a choice it freezes the game via endGame() and closes.
 */
const EndGamePrompt = ({ onClose }: EndGamePromptProps) => {
  const { match, endGame } = useMatch();
  if (!match) return null;

  const [p1, p2] = match.players;
  const n = match.currentGameIndex + 1;

  const choose = (result: GameResult) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    endGame(result);
    onClose();
  };

  const cancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Animated.View
      entering={BACKDROP_ENTER}
      exiting={BACKDROP_EXIT}
      className="absolute inset-0 items-center justify-center bg-background/85 px-6"
    >
      {/* A tap outside cancels, like the card popup. */}
      <Pressable accessible={false} onPress={cancel} className="absolute inset-0" />
      <Animated.View
        entering={POPUP_ENTER}
        exiting={POPUP_EXIT}
        className="w-full max-w-sm rounded-3xl border border-border bg-elevated p-5"
      >
        <Text className="text-center font-display-bold text-[22px] text-ink-primary">
          {match.bestOf === 1 ? 'Who won?' : `Who won game ${n}?`}
        </Text>
        <Text className="mb-5 mt-1 text-center text-[13px] text-ink-secondary">
          Tap the winner. This ends the game.
        </Text>

        <View className="flex-row gap-3">
          <WinnerTile player={p1} result="win" onPress={() => choose('p1')} />
          <WinnerTile player={p2} result="loss" onPress={() => choose('p2')} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => choose('draw')}
          className="mt-4 items-center rounded-full border border-border bg-surface py-3.5 active:bg-background"
        >
          <Text className="font-display-bold text-base text-ink-primary">Draw</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={cancel} className="mt-1 items-center py-3">
          <Text className="font-display text-base text-ink-secondary">Keep playing</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export default EndGamePrompt;
