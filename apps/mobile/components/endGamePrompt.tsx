import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { GameResult } from '@/contexts/matchContext';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

type EndGamePromptProps = {
  onClose: () => void;
};

/**
 * One of the two winner buttons, tinted by the result it records for p1 — the
 * device owner. `win` is you taking the game, `loss` the opponent taking it.
 */
const ResultChoice = ({
  result,
  label,
  onPress,
}: {
  result: 'win' | 'loss';
  label: string;
  onPress: () => void;
}) => {
  const won = result === 'win';
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mb-3 rounded-xl border px-5 py-4 ${
        won
          ? 'border-win/40 bg-win-tint active:bg-win-deep'
          : 'border-loss/40 bg-loss-tint active:bg-loss-deep'
      }`}
    >
      <Text
        className={`text-center text-base font-bold ${
          won ? 'text-win-text' : 'text-loss-text'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Confirm overlay shown when the player taps END. Guards against accidental
 * taps (nothing auto-ends) and captures who won the game — or a draw. On a
 * choice it freezes the game via endGame() and closes.
 */
const EndGamePrompt = ({ onClose }: EndGamePromptProps) => {
  const { match, endGame } = useMatch();
  if (!match) return null;

  const [p1, p2] = match.players;

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
    <View className="absolute inset-0 items-center justify-center bg-background/80 px-8">
      <View className="w-full max-w-sm rounded-2xl border border-border bg-elevated p-6">
        <Text className="mb-1 text-center text-xl font-bold text-ink-primary">
          End this game?
        </Text>
        <Text className="mb-6 text-center text-sm text-ink-secondary">
          Who won?
        </Text>

        {/* Bare names: the prompt above already asks "Who won?", so each button
            is just an answer to it. They carry the result they'd record from
            p1's perspective — green for your win, red for the opponent's — so
            the outcome is telegraphed before the tap. The hue isn't carrying
            the meaning on its own (the question does), so no W/L badge. */}
        <ResultChoice
          result="win"
          label={p1?.name ?? 'Player 1'}
          onPress={() => choose('p1')}
        />
        <ResultChoice
          result="loss"
          label={p2?.name ?? 'Player 2'}
          onPress={() => choose('p2')}
        />

        <TouchableOpacity
          onPress={() => choose('draw')}
          className="mb-3 rounded-xl border border-border bg-surface px-5 py-4 active:bg-elevated"
        >
          <Text className="text-center text-base font-semibold text-ink-primary">
            Draw
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={cancel} className="px-5 py-3">
          <Text className="text-center text-base font-medium text-ink-secondary">
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EndGamePrompt;
