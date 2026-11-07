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
};

/**
 * The score for one player: the numeral, and under it the buttons. The match's
 * scoring mode (Profile → Scoring, fixed when the match starts) picks them:
 *
 * - **Detailed** — the three ways a point is taken: conquer, hold, special. A
 *   point is scored by saying HOW, which reads off the board at a glance and
 *   is recorded with the point (the match detail's graph colors by it).
 * - **Simple** — a plain counter: − and a wide +, like most score apps. Points
 *   are recorded without an action.
 *
 * Either way, tapping the numeral takes a point back, so the habit carries
 * over between modes.
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

// A take-back is usually fixing a mis-tap, so its feedback is quiet: the
// numeral dips a little and tints toward red for a moment. Raw values mirror
// `ink-primary` and `loss-text` (an animated color can't take a class).
const INK_PRIMARY = '#E4E5F2';
// The simple board's icons (Feather takes a color, not a class): mirror
// `ink-secondary` and `accent-soft`.
const INK_SECONDARY = '#868FB0';
const ACCENT_SOFT = '#A6ADE6';
const LOSS_TEXT = '#FB8181';
const DIP_SCALE = 0.92;
const DIP_MS = 90;
const SETTLE_MS = 260;
const TINT = 0.7;

// The "+1" that lifts off the pressed button: how far it travels, and how long
// it takes to rise and fade out.
const FLOAT_PX = 36;
const FLOAT_MS = 650;

type Action = (typeof ACTIONS)[number];

/** Rises out of a button and fades: the receipt for a point scored. */
const useFloat = () => {
  const fly = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    // Fades in fast, then drifts away over the rest of the travel.
    opacity: interpolate(fly.value, [0, 0.15, 1], [0, 1, 0]),
    transform: [{ translateY: -FLOAT_PX * fly.value }],
  }));
  const play = () => {
    // Restart from zero so rapid taps each get their own lift rather than
    // continuing a run that's already fading.
    fly.value = 0;
    fly.value = withTiming(1, {
      duration: FLOAT_MS,
      easing: Easing.out(Easing.quad),
    });
  };
  return { style, play };
};

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
  const float = useFloat();

  const press = () => {
    onScore(action.key);
    float.play();
  };

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={float.style}
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

/**
 * The simple board's two buttons: − takes a point back, + scores one. Same
 * height and overall width as the three action buttons, so the half keeps its
 * layout; + is the wide one, since it's what you tap all game.
 */
const SimpleButtons = ({
  name,
  onScore,
  onUndo,
}: {
  name: string;
  onScore: () => void;
  onUndo: () => void;
}) => {
  const float = useFloat();

  return (
    <>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={`Remove a point from ${name}`}
        className="h-[67px] w-[83px] items-center justify-center rounded-2xl border-2 border-border bg-surface active:opacity-80"
      >
        <Feather name="minus" size={26} color={INK_SECONDARY} />
      </Pressable>

      <View>
        <Animated.View
          pointerEvents="none"
          style={float.style}
          className="absolute inset-x-0 -top-6 items-center"
        >
          <Text className="font-mono text-xl text-accent-soft">+1</Text>
        </Animated.View>
        <Pressable
          onPress={() => {
            onScore();
            float.play();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add a point for ${name}`}
          className="h-[67px] w-[178px] items-center justify-center rounded-2xl border-2 border-accent bg-accent/15 active:opacity-80"
        >
          <Feather name="plus" size={28} color={ACCENT_SOFT} />
        </Pressable>
      </View>
    </>
  );
};

const ScoringComponent = ({ playerId }: ScoringComponentProps) => {
  const { match, incrementScore, decrementScore } = useMatch();

  // The take-back: a small dip and a brief red tint — different from a point
  // scored, without making a fuss of a correction.
  const dip = useSharedValue(1);
  const tint = useSharedValue(0);
  const numeralStyle = useAnimatedStyle(() => ({
    color: interpolateColor(tint.value, [0, 1], [INK_PRIMARY, LOSS_TEXT]),
    transform: [{ scale: dip.value }],
  }));

  // Landscape halves are short, so the numeral shrinks to keep the buttons
  // under it on screen.
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const player = match?.players.find((p) => p.id === playerId);
  if (!player) return null;

  // Which button was pressed is recorded with the point (the match detail's
  // timeline shows it).
  const simple = match?.scoringMode === 'simple';

  const onScore = (action: Action['key'] | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    incrementScore(playerId, action);
  };

  const onUndo = () => {
    // At 0 there's nothing to take back (and nothing is recorded).
    if (player.gameScore <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    decrementScore(playerId);
    const ease = Easing.out(Easing.quad);
    dip.value = withSequence(
      withTiming(DIP_SCALE, { duration: DIP_MS, easing: ease }),
      withTiming(1, { duration: SETTLE_MS, easing: ease }),
    );
    tint.value = withSequence(
      withTiming(TINT, { duration: DIP_MS }),
      withTiming(0, { duration: SETTLE_MS + 120, easing: ease }),
    );
  };

  return (
    <View className="items-center">
      {/* The numeral is the correction: the buttons add, tapping the score
          takes one back (the simple board also has its own −). */}
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
        {simple ? (
          <SimpleButtons
            name={player.name}
            onScore={() => onScore(null)}
            onUndo={onUndo}
          />
        ) : (
          ACTIONS.map((action) => (
            <ActionButton key={action.key} action={action} onScore={onScore} />
          ))
        )}
      </View>
    </View>
  );
};

export default ScoringComponent;
