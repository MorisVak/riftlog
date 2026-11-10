import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { ScoringMode } from '@riftlog/core';
import Icon from '@/components/icon';

/**
 * Detailed or Simple scoring, as two cards side by side, each with a small
 * board that plays itself: points go on one by one (up to 8, then a new
 * game), so you see how each board scores before you pick it. Used by
 * onboarding and Profile's scoring sheet.
 *
 * The previews are drawn from plain Views in the board's own tokens; they
 * are decorative (hidden from screen readers — each card's label says what
 * the board does). Still with Reduce Motion.
 */

const STEP_MS = 1200;
const TARGET = 8;
const FLOAT_MS = 650;

export const SCORING_LABEL: Record<ScoringMode, string> = {
  detailed: 'Detailed',
  simple: 'Simple',
};

const OPTIONS: { value: ScoringMode; hint: string; spoken: string }[] = [
  {
    value: 'detailed',
    hint: 'Conquer, hold or special',
    spoken: 'Score each point as conquer, hold or special.',
  },
  {
    value: 'simple',
    hint: 'Just the score',
    spoken: 'Tap the right side to add a point, the left to take one back.',
  },
];

const ACTIONS = [
  { icon: 'flag', box: 'border-conquer bg-conquer-tint', ink: 'text-conquer' },
  { icon: 'shield', box: 'border-hold bg-hold-tint', ink: 'text-hold' },
  { icon: 'star', box: 'border-special bg-special-tint', ink: 'text-special' },
] as const;

/** The preview's clock: a step counter, plus the press and "+1" animations. */
const usePlayback = () => {
  const still = useReducedMotion();
  const [step, setStep] = useState(0);
  const press = useSharedValue(0);
  const fly = useSharedValue(1);

  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => {
      setStep((s) => s + 1);
      press.value = withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }),
      );
      fly.value = 0;
      fly.value = withTiming(1, { duration: FLOAT_MS, easing: Easing.out(Easing.quad) });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [still, press, fly]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.88]) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: press.value }));
  const floatStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fly.value, [0, 0.15, 1], [0, 1, 0]),
    transform: [{ translateY: -18 * fly.value }],
  }));

  // 0 → 8, then a new game. Reduce Motion shows a game in progress.
  const score = still ? 5 : step % (TARGET + 1);
  return { step, score, pressStyle, flashStyle, floatStyle };
};

const Numeral = ({ score }: { score: number }) => (
  <Text className="w-[30px] text-center font-mono text-[34px] leading-[38px] text-ink-primary">
    {score}
  </Text>
);

/** The detailed board in small: the numeral over conquer / hold / special. */
const DetailedPreview = () => {
  const { step, score, pressStyle, floatStyle } = usePlayback();
  // The point just scored came from this button (none at a new game's 0).
  const active = score === 0 ? -1 : (step - 1) % ACTIONS.length;
  return (
    <View className="items-center">
      <Numeral score={score} />
      <View className="mt-2 flex-row gap-1.5">
        {ACTIONS.map((a, i) => (
          <View key={a.icon}>
            {i === active && (
              <Animated.View style={floatStyle} className="absolute inset-x-0 -top-4 items-center">
                <Text className={`font-mono text-[11px] ${a.ink}`}>+1</Text>
              </Animated.View>
            )}
            <Animated.View
              style={i === active ? pressStyle : undefined}
              className={`h-[26px] w-[34px] items-center justify-center rounded-lg border ${a.box}`}
            >
              <Icon name={a.icon} size={12} className={a.ink} />
            </Animated.View>
          </View>
        ))}
      </View>
    </View>
  );
};

/** The simple board in small: − numeral +, the right half lighting up. */
const SimplePreview = () => {
  const { score, flashStyle, floatStyle } = usePlayback();
  return (
    <>
      <Animated.View
        style={flashStyle}
        className="absolute bottom-0 right-0 top-0 w-1/2 bg-accent/10"
      />
      <View className="flex-row items-center gap-3">
        <Icon name="minus" size={20} className="text-ink-primary" />
        <Numeral score={score} />
        <View>
          {score > 0 && (
            <Animated.View style={floatStyle} className="absolute inset-x-0 -top-4 items-center">
              <Text className="font-mono text-[11px] text-accent-soft">+1</Text>
            </Animated.View>
          )}
          <Icon name="plus" size={20} className="text-accent-soft" />
        </View>
      </View>
    </>
  );
};

const ScoringChoice = ({
  value,
  onChange,
}: {
  value: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}) => (
  <View accessibilityRole="radiogroup" className="flex-row gap-3">
    {OPTIONS.map((o) => {
      const selected = o.value === value;
      return (
        <TouchableOpacity
          key={o.value}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          accessibilityLabel={`${SCORING_LABEL[o.value]}. ${o.spoken}`}
          activeOpacity={0.8}
          onPress={() => {
            if (selected) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(o.value);
          }}
          className={`flex-1 rounded-2xl border p-2 ${
            selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
          }`}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            className="h-[104px] items-center justify-center overflow-hidden rounded-xl bg-background"
          >
            {o.value === 'detailed' ? <DetailedPreview /> : <SimplePreview />}
          </View>
          <View className="mt-2.5 flex-row items-center gap-2 px-1 pb-1">
            <View className="flex-1">
              <Text className="font-display text-[15px] text-ink-primary">
                {SCORING_LABEL[o.value]}
              </Text>
              <Text className="mt-0.5 text-[12px] text-ink-tertiary" numberOfLines={1}>
                {o.hint}
              </Text>
            </View>
            {/* Shape + icon, not color alone. */}
            <View
              className={`h-5 w-5 items-center justify-center rounded-full ${
                selected ? 'bg-accent' : 'border-2 border-ink-tertiary'
              }`}
            >
              {selected && <Icon name="check" size={12} className="text-background" />}
            </View>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default ScoringChoice;
