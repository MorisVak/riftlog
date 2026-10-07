import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon from '@/components/icon';

/**
 * The round checkbox a row shows in selection mode: hollow when not selected,
 * accent-filled with a tick when it is (shape + icon, not color alone).
 */
const SelectCheck = ({ selected }: { selected: boolean }) => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    className={`h-[22px] w-[22px] items-center justify-center rounded-full ${
      selected ? 'bg-accent' : 'border-2 border-ink-tertiary'
    }`}
  >
    {selected && <Icon name="check" size={14} className="text-background" />}
  </View>
);

/** Check (22) + gap to the card (12). */
const GUTTER_W = 34;
const SLIDE_MS = 220;
const SLIDE_EASING = Easing.out(Easing.cubic);

/**
 * The space to a row's left that holds its check in selection mode.
 *
 * It's always mounted and animates its WIDTH 0 → 34: because the card next to
 * it is `flex-1`, the card slides right as the gutter opens (and back as it
 * closes) instead of jumping, while the check itself slides in from the left
 * and fades up. Used by History and "My decks" rows so both move identically.
 */
export const SelectionGutter = ({
  selecting,
  selected,
}: {
  selecting: boolean;
  selected: boolean;
}) => {
  const progress = useSharedValue(selecting ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selecting ? 1 : 0, {
      duration: SLIDE_MS,
      easing: SLIDE_EASING,
    });
  }, [selecting, progress]);

  const gutterStyle = useAnimatedStyle(() => ({
    width: GUTTER_W * progress.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (progress.value - 1) * 14 }],
  }));

  return (
    <Animated.View style={gutterStyle} className="overflow-hidden">
      <Animated.View style={checkStyle} className="w-[22px]">
        <SelectCheck selected={selected} />
      </Animated.View>
    </Animated.View>
  );
};

export default SelectCheck;
