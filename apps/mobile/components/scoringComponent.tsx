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
 * - **Simple** — a plain counter, like most score apps: the left half of the
 *   field takes a point back, the right half scores one, with − · score · +
 *   drawn across the middle. Points are recorded without an action.
 *
 * On the detailed board, tapping the numeral takes a point back.
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
 * The − / + mark either side of the numeral on the simple board. Only a hint:
 * the tap target is the whole half of the field it sits in (`SimpleBoard`).
 * Round, like a counter's; + is the accent, − stays quiet. Dims while its
 * side is held down.
 */
const CounterMark = ({
  kind,
  size,
  pressed,
}: {
  kind: 'minus' | 'plus';
  size: number;
  pressed: boolean;
}) => {
  const plus = kind === 'plus';
  return (
    <View
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-full border-2 ${
        plus ? 'border-accent bg-accent/15' : 'border-border bg-surface'
      } ${pressed ? 'opacity-70' : ''}`}
    >
      <Feather
        name={kind}
        size={Math.round(size * 0.4)}
        color={plus ? ACCENT_SOFT : INK_SECONDARY}
      />
    </View>
  );
};

/**
 * The simple board: the player's whole half is the button. Anything left of
 * the middle takes a point back, anything right of it scores one — easy to
 * hit without looking. The numeral and the − / + marks sit on top and let
 * taps through. Covers the half (absolute fill of the tracking field); the
 * name, END and the clock are drawn after it, so they stay on top and keep
 * their own taps. Turned with the half, so it's left / right for each player.
 */
const SimpleBoard = ({
  name,
  numeral,
  landscape,
  onScore,
  onUndo,
}: {
  name: string;
  numeral: React.ReactNode;
  landscape: boolean;
  onScore: () => void;
  onUndo: () => void;
}) => {
  const float = useFloat();
  const [held, setHeld] = React.useState<'minus' | 'plus' | null>(null);
  const size = landscape ? 60 : 76;

  return (
    <View className="absolute inset-0 flex-row">
      <Pressable
        onPress={onUndo}
        onPressIn={() => setHeld('minus')}
        onPressOut={() => setHeld(null)}
        accessibilityRole="button"
        accessibilityLabel={`Remove a point from ${name}`}
        className={`flex-1 ${held === 'minus' ? 'bg-ink-primary/5' : ''}`}
      />
      <Pressable
        onPress={() => {
          onScore();
          float.play();
        }}
        onPressIn={() => setHeld('plus')}
        onPressOut={() => setHeld(null)}
        accessibilityRole="button"
        accessibilityLabel={`Add a point for ${name}`}
        className={`flex-1 ${held === 'plus' ? 'bg-accent/10' : ''}`}
      />

      <View
        pointerEvents="none"
        className={`absolute inset-0 flex-row items-center justify-center ${
          landscape ? 'gap-4' : 'gap-3'
        }`}
      >
        <CounterMark kind="minus" size={size} pressed={held === 'minus'} />
        {numeral}
        <View>
          <Animated.View style={float.style} className="absolute inset-x-0 -top-7 items-center">
            <Text className="font-mono text-xl text-accent-soft">+1</Text>
          </Animated.View>
          <CounterMark kind="plus" size={size} pressed={held === 'plus'} />
        </View>
      </View>
    </View>
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
  // on screen.
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

  // The numeral is the correction on the detailed board: the buttons add,
  // tapping the score takes one back. On the simple board it's only the
  // number — the half it sits on is the button.
  const numeralText = (
    <Animated.Text
      style={numeralStyle}
      // On the simple board the numeral holds two digits' width, so the
      // marks beside it don't shift when the score reaches 10.
      className={`text-center font-mono leading-none ${
        landscape ? 'text-[80px]' : 'text-[150px]'
      } ${simple ? (landscape ? 'min-w-[100px]' : 'min-w-[184px]') : ''}`}
    >
      {player.gameScore}
    </Animated.Text>
  );

  if (simple) {
    return (
      <SimpleBoard
        name={player.name}
        numeral={numeralText}
        landscape={landscape}
        onScore={() => onScore(null)}
        onUndo={onUndo}
      />
    );
  }

  const numeral = (
    <Pressable
      onPress={onUndo}
      accessibilityRole="button"
      accessibilityLabel={`Remove a point from ${player.name}`}
      className="active:opacity-80"
    >
      {numeralText}
    </Pressable>
  );

  return (
    <View className="items-center">
      {numeral}
      <View className={`flex-row gap-3 ${landscape ? 'mt-2' : 'mt-7'}`}>
        {ACTIONS.map((action) => (
          <ActionButton key={action.key} action={action} onScore={onScore} />
        ))}
      </View>
    </View>
  );
};

export default ScoringComponent;
