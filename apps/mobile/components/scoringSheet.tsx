import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ScoringMode } from '@riftlog/core';
import Icon from '@/components/icon';
import ScoringChoice from '@/components/scoringChoice';

/**
 * Profile → Scoring: the two boards with their previews, in a sheet from the
 * bottom (built like History's filter sheet). A pick saves at once; the
 * board is fixed when a match starts, so a match in progress keeps its own.
 */
const ScoringSheet = ({
  visible,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: ScoringMode;
  onChange: (mode: ScoringMode) => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  return (
    // Translucent bars: full screen on Android too (see filterSheet.tsx).
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        className="flex-1 justify-end bg-background/70"
      >
        <Pressable accessibilityLabel="Close" onPress={onClose} className="absolute inset-0" />
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={{ paddingBottom: insets.bottom + 12 }}
          className="rounded-t-3xl border border-b-0 border-border bg-elevated px-5"
        >
          <View className="flex-row items-center justify-between pb-4 pt-4">
            <Text className="font-display-bold text-xl text-ink-primary">Scoring mode</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
            >
              <Icon name="x" size={16} className="text-ink-secondary" />
            </TouchableOpacity>
          </View>
          <ScoringChoice value={value} onChange={onChange} />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onClose}
            className="mt-6 h-12 items-center justify-center rounded-full bg-accent active:bg-accent-strong"
          >
            <Text className="font-display-bold text-base text-background">Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default ScoringSheet;
