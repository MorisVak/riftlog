import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
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
 *
 * The check is tappable too (`onToggle`), not just the card: the gutter
 * stretches to the row's full height so the whole strip left of the card is
 * the hit target.
 */
export const SelectionGutter = ({
  selecting,
  selected,
  onToggle,
}: {
  selecting: boolean;
  selected: boolean;
  onToggle?: () => void;
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
    <Animated.View style={gutterStyle} className="self-stretch overflow-hidden">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityElementsHidden={!selecting}
        disabled={!selecting || !onToggle}
        onPress={() => {
          Haptics.selectionAsync();
          onToggle?.();
        }}
        className="flex-1 justify-center"
      >
        <Animated.View style={checkStyle} className="w-[22px]">
          <SelectCheck selected={selected} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export default SelectCheck;
