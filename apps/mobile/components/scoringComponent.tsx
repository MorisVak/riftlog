import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

type ScoringComponentProps = {
  playerId: PlayerId;
  /** A point was taken back: the half plays its "hit" (a red flash). */
  onHit?: () => void;
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

// The take-back "hit" on the numeral: a quick sideways shake while it flashes
// red. Raw values mirror `ink-primary` and `loss-text` (an animated color
// can't take a class).
const INK_PRIMARY = '#E4E5F2';
const LOSS_TEXT = '#FB8181';
const SHAKE_PX = 12;
const SHAKE_STEP_MS = 45;
const HIT_COLOR_MS = 380;

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
const ActionButton = ({
  action,
  onScore,
}: {
  action: Action;
  onScore: (action: Action['key']) => void;
}) => {
  const fly = useSharedValue(0);

  const flyStyle = useAnimatedStyle(() => ({
    // Fades in fast, then drifts away over the rest of the travel.
    opacity: interpolate(fly.value, [0, 0.15, 1], [0, 1, 0]),
    transform: [{ translateY: -FLOAT_PX * fly.value }],
  }));

  const press = () => {
    onScore(action.key);
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
        className={`h-[67px] w-[83px] items-center justify-center rounded-2xl border-2 active:opacity-80 ${action.className}`}
      >
        <Feather
          name={action.icon}
          size={22}
          color={ACTION_COLOR[action.key]}
        />
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

const ScoringComponent = ({ playerId, onHit }: ScoringComponentProps) => {
  const { match, incrementScore, decrementScore } = useMatch();

  // The hit: the numeral shakes and flashes red, so taking a point back
  // feels different from scoring one (like a hit in a game).
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const numeralStyle = useAnimatedStyle(() => ({
    color: interpolateColor(flash.value, [0, 1], [INK_PRIMARY, LOSS_TEXT]),
    transform: [{ translateX: shake.value }],
  }));

  // Landscape halves are short, so the numeral shrinks to keep the buttons
  // under it on screen.
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  // Which button was pressed is recorded with the point (the match detail's
  // timeline shows it).
  const onScore = (action: Action['key']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    incrementScore(playerId, action);
  };

  const onUndo = () => {
    // At 0 there's nothing to take back (and nothing is recorded).
    if (player.gameScore <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    decrementScore(playerId);
    shake.value = withSequence(
      withTiming(-SHAKE_PX, { duration: SHAKE_STEP_MS }),
      withTiming(SHAKE_PX, { duration: SHAKE_STEP_MS }),
      withTiming(-SHAKE_PX * 0.6, { duration: SHAKE_STEP_MS }),
      withTiming(SHAKE_PX * 0.6, { duration: SHAKE_STEP_MS }),
      withTiming(0, { duration: SHAKE_STEP_MS }),
    );
    flash.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: HIT_COLOR_MS, easing: Easing.out(Easing.quad) }),
    );
    onHit?.();
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
        <Animated.Text
          style={numeralStyle}
          className={`font-mono leading-none ${landscape ? 'text-[80px]' : 'text-[150px]'}`}
        >
          {player.gameScore}
        </Animated.Text>
      </Pressable>

      <View className={`flex-row gap-3 ${landscape ? 'mt-2' : 'mt-7'}`}>
        {ACTIONS.map((action) => (
          <ActionButton key={action.key} action={action} onScore={onScore} />
        ))}
      </View>
    </View>
  );
};

export default ScoringComponent;
