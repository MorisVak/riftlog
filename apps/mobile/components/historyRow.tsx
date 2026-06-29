import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { HistoryRowVM, Result } from '@/lib/historyView';

// Result tokens, paired with a letter + left bar so color is never the only
// signal (colorblind-safe rule).
const RESULT: Record<Result, { bar: string; badge: string; text: string }> = {
  win: { bar: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { bar: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bar: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
};

const INK_SECONDARY = '#868FB0';

// Expand/collapse share one timing window so the result bar, the detail height,
// and the chevron all move together — no half-collapsed "cut off" bar.
const EXPAND_MS = 240;
const EXPAND_EASING = Easing.inOut(Easing.cubic);

const GameChip = ({ n, label, letter, result }: HistoryRowVM['games'][number]) => {
  const r = RESULT[result];
  return (
    <View className="flex-row items-center gap-2 rounded-lg border border-border bg-elevated px-2.5 py-1.5">
      <Text className="font-display text-[10px] text-ink-secondary">G{n}</Text>
      <Text className="font-mono text-xs text-ink-primary">{label}</Text>
      <View className={`h-4 w-4 items-center justify-center rounded ${r.badge}`}>
        <Text className={`font-display-bold text-[10px] ${r.text}`}>{letter}</Text>
      </View>
    </View>
  );
};

type Props = {
  vm: HistoryRowVM;
  index: number;
  expanded: boolean;
  onToggle: (id: string) => void;
};

const HistoryRow = ({ vm, index, expanded, onToggle }: Props) => {
  const r = RESULT[vm.result];

  // Natural height of the detail block, measured once from the always-mounted
  // (but clipped) content so we can animate the container height to/from it.
  const [detailH, setDetailH] = useState(0);

  const progress = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: EXPAND_MS,
      easing: EXPAND_EASING,
    });
  }, [expanded, progress]);

  // Animating `height` (a layout prop) re-lays out the row each frame, so the
  // self-stretch result bar tracks the growing/shrinking card in lockstep.
  const detailStyle = useAnimatedStyle(() => ({
    height: detailH * progress.value,
    opacity: progress.value,
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(vm.id);
  };

  return (
    <Animated.View
      // Subtle fade + slight rise on mount, matching the design's `rowIn`.
      entering={FadeInDown.duration(380)
        .delay(Math.min(index, 8) * 35)
        .withInitialValues({ transform: [{ translateY: 6 }] })}
      className="flex-row overflow-hidden rounded-xl border border-border bg-surface"
    >
      {/* Result bar spans the full card height, including the expanded area. */}
      <View className={`w-1 self-stretch ${r.bar}`} />

      <View className="flex-1">
        <Pressable
          onPress={toggle}
          className="flex-row items-center active:bg-elevated"
        >
          <View
            className={`m-3 h-7 w-7 items-center justify-center rounded-lg ${r.badge}`}
          >
            <Text className={`font-display-bold text-sm ${r.text}`}>
              {vm.letter}
            </Text>
          </View>

          <View className="flex-1 py-3">
            <Text
              className="font-display text-[15px] font-semibold text-ink-primary"
              numberOfLines={1}
            >
              {vm.opponent}
            </Text>
            <Text className="mt-0.5 text-xs text-ink-secondary">{vm.format}</Text>
          </View>

          <View className="items-end py-3">
            <Text className={`font-mono text-[15px] ${r.text}`}>{vm.score}</Text>
            <Text className="mt-0.5 text-[11px] text-ink-secondary">{vm.date}</Text>
          </View>

          <Animated.View
            style={chevronStyle}
            className="h-[26px] w-9 items-center justify-center"
          >
            <Feather name="chevron-down" size={16} color={INK_SECONDARY} />
          </Animated.View>
        </Pressable>

        {/* Always mounted; height + opacity animate from a single `progress`. */}
        <Animated.View style={detailStyle} className="overflow-hidden">
          <View
            onLayout={(e) => setDetailH(e.nativeEvent.layout.height)}
            className="flex-row flex-wrap gap-2 pb-3 pl-[52px] pr-3"
          >
            {vm.games.map((g) => (
              <GameChip key={g.n} {...g} />
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default HistoryRow;
