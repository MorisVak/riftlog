import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

type ScoringComponentProps = {
  playerId: PlayerId;
};

/**
 * The score for one player: the numeral, and under it the three ways a point is
 * taken — conquer, hold, special. A point is scored by saying HOW it was
 * scored, which reads off the board at a glance and leaves room to record the
 * breakdown later. Tapping the numeral takes a point back, so correcting a
 * mistap needs no separate control on the half.
 *
 * All three actions currently add 1 and nothing more — which one was pressed
 * isn't stored yet (that would need a field on Game).
 */

// Action tokens as raw values: Feather takes a color prop, not a className.
// Mirrors the conquer / hold / special families in tailwind.config.js.
const ACTION_COLOR = {
  conquer: '#34D399',
  hold: '#E0B94A',
  special: '#E879C7',
} as const;

type ActionKey = keyof typeof ACTION_COLOR;

const ACTIONS: {
  key: ActionKey;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  className: string;
  textClass: string;
}[] = [
  {
    key: 'conquer',
    icon: 'flag',
    label: 'CONQUER',
    className: 'border-conquer bg-conquer-tint',
    textClass: 'text-conquer',
  },
  {
    key: 'hold',
    icon: 'shield',
    label: 'HOLD',
    className: 'border-hold bg-hold-tint',
    textClass: 'text-hold',
  },
  {
    key: 'special',
    icon: 'star',
    label: 'SPECIAL',
    className: 'border-special bg-special-tint',
    textClass: 'text-special',
  },
];

// The "+1" that lifts off the pressed button: how far it travels, and how long
// it takes to rise and fade out.
const FLOAT_PX = 36;
const FLOAT_MS = 650;

type Action = (typeof ACTIONS)[number];

/**
 * One scoring button, with its own floating "+1". The receipt rises out of the
 * button that was pressed, in that button's color, so at a glance you can see
 * which action scored — and on the rotated half it lifts toward that player,
 * since the whole field is turned to face them.
 */
const ActionButton = ({ action, onScore }: { action: Action; onScore: () => void }) => {
  const fly = useSharedValue(0);

  const flyStyle = useAnimatedStyle(() => ({
    // Fades in fast, then drifts away over the rest of the travel.
    opacity: interpolate(fly.value, [0, 0.15, 1], [0, 1, 0]),
    transform: [{ translateY: -FLOAT_PX * fly.value }],
  }));

  const press = () => {
    onScore();
    // Restart from zero so rapid taps each get their own lift rather than
    // continuing a run that's already fading.
    fly.value = 0;
    fly.value = withTiming(1, {
      duration: FLOAT_MS,
      easing: Easing.out(Easing.quad),
    });
  };

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={flyStyle}
        className="absolute inset-x-0 -top-6 items-center"
      >
        <Text className={`font-mono text-xl ${action.textClass}`}>+1</Text>
      </Animated.View>

      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${action.label} — score a point`}
        className={`h-[62px] w-[78px] items-center justify-center rounded-2xl border-2 active:opacity-80 ${action.className}`}
      >
        <Feather name={action.icon} size={22} color={ACTION_COLOR[action.key]} />
        {/* Labelled as well as colored — the icons alone don't carry the
            Riftbound meaning, and color is never the only signal. */}
        <Text
          className={`mt-1 font-display text-[9px] tracking-wider ${action.textClass}`}
        >
          {action.label}
        </Text>
      </Pressable>
    </View>
  );
};

const ScoringComponent = ({ playerId }: ScoringComponentProps) => {
  const { match, incrementScore, decrementScore } = useMatch();

  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  const onScore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    incrementScore(playerId);
  };

  const onUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    decrementScore(playerId);
  };

  return (
    <View className="items-center">
      {/* The numeral is the correction: the action buttons add, tapping the
          score takes one back. No separate decrement control. */}
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={`Remove a point from ${player.name}`}
        className="active:opacity-80"
      >
        <Text className="font-mono text-[150px] leading-none text-ink-primary">
          {player.gameScore}
        </Text>
      </Pressable>

      <View className="mt-7 flex-row gap-3">
        {ACTIONS.map((action) => (
          <ActionButton key={action.key} action={action} onScore={onScore} />
        ))}
      </View>
    </View>
  );
};

export default ScoringComponent;
