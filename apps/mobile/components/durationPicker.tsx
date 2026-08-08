import React, { useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Two snapping wheels — minutes and seconds — for setting a custom match clock,
 * the way the phone's own timer does it.
 *
 * Deliberately built from a plain snapping ScrollView rather than a picker
 * dependency: it's a handful of props (`snapToInterval` + fast deceleration),
 * it renders with the app's own tokens instead of a platform widget, and it
 * keeps the native module list short (see the mobile CLAUDE.md).
 */

// Row height drives the snap interval and the height of the centered selection
// band, so all three must stay in agreement.
const ITEM_H = 40;
// Rows visible at once. Odd, so exactly one row sits centered in the band.
const VISIBLE = 3;
const WHEEL_H = ITEM_H * VISIBLE;
// Padding above/below the list so the first and last values can reach center.
const PAD = (WHEEL_H - ITEM_H) / 2;

const MINUTES = Array.from({ length: 121 }, (_, i) => i); // 0–120
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

type WheelProps = {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  label: string;
};

const Wheel = ({ values, value, onChange, label }: WheelProps) => {
  const index = Math.max(0, values.indexOf(value));

  // Snapping means the resting offset is always a whole number of rows, so the
  // landed value is just the rounded row index.
  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const landed = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const next = values[Math.min(Math.max(landed, 0), values.length - 1)];
      if (next !== undefined && next !== value) {
        Haptics.selectionAsync();
        onChange(next);
      }
    },
    [onChange, value, values],
  );

  return (
    <View className="flex-1 flex-row items-center justify-center gap-2">
      <ScrollView
        style={{ height: WHEEL_H, width: 64 }}
        contentContainerStyle={{ paddingVertical: PAD }}
        contentOffset={{ x: 0, y: index * ITEM_H }}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        // Momentum covers a flick; the drag handler catches a slow drag that
        // settles without any momentum phase.
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
      >
        {values.map((v) => {
          const selected = v === value;
          return (
            <View key={v} style={{ height: ITEM_H }} className="justify-center">
              <Text
                className={`text-center font-mono text-xl ${
                  selected ? 'text-ink-primary' : 'text-ink-tertiary'
                }`}
              >
                {String(v).padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <Text className="w-8 font-display text-xs text-ink-secondary">{label}</Text>
    </View>
  );
};

type Props = {
  minutes: number;
  seconds: number;
  onChange: (next: { minutes: number; seconds: number }) => void;
};

const DurationPicker = ({ minutes, seconds, onChange }: Props) => (
  <View
    style={{ height: WHEEL_H }}
    className="flex-row overflow-hidden rounded-xl border border-border bg-elevated"
  >
    {/* The selection band sits behind both wheels and never moves — the values
        scroll through it, exactly like the phone's timer. */}
    <View
      pointerEvents="none"
      style={{ height: ITEM_H, top: PAD }}
      className="absolute inset-x-0 border-y border-border bg-surface"
    />

    <Wheel
      values={MINUTES}
      value={minutes}
      onChange={(m) => onChange({ minutes: m, seconds })}
      label="min"
    />
    <Wheel
      values={SECONDS}
      value={seconds}
      onChange={(s) => onChange({ minutes, seconds: s })}
      label="sec"
    />
  </View>
);

export default DurationPicker;
