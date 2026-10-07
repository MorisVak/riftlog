import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Icon from '@/components/icon';

// Same feel as the match-history rows (components/historyRow.tsx): swipe left
// to reveal a red Delete action behind the card, then confirm.
const ACTION_W = 80;
const SWIPE_MS = 180;

type Props = {
  /** Screen-reader label for the action, e.g. "Delete deck Kennen". */
  accessibilityLabel: string;
  /** The confirmation alert. */
  confirmTitle: string;
  confirmMessage: string;
  onDelete: () => void;
  /** Card classes for the outer clip (radius/border must live here). */
  className?: string;
  /**
   * The row. `isOpen` / `close` let a tap on an open row close it instead of
   * acting — same rule as the history rows.
   */
  children: (row: { isOpen: boolean; close: () => void }) => React.ReactNode;
};

/**
 * Swipe-left-to-delete for a list row. Horizontal drags open it; vertical
 * drags fail the gesture so the list still scrolls. Deleting always goes
 * through a confirmation alert.
 */
const SwipeToDelete = ({
  accessibilityLabel,
  confirmTitle,
  confirmMessage,
  onDelete,
  className = '',
  children,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const tx = useSharedValue(0);
  const startTx = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const close = () => {
    tx.value = withTiming(0, { duration: SWIPE_MS });
    setIsOpen(false);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startTx.value = tx.value;
    })
    .onUpdate((e) => {
      tx.value = Math.min(0, Math.max(-ACTION_W, startTx.value + e.translationX));
    })
    .onEnd((e) => {
      const shouldOpen = tx.value < -ACTION_W / 2 || e.velocityX < -600;
      tx.value = withTiming(shouldOpen ? -ACTION_W : 0, { duration: SWIPE_MS });
      runOnJS(setIsOpen)(shouldOpen);
    });

  const confirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancel', style: 'cancel', onPress: close },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View className={`overflow-hidden ${className}`}>
      {/* The action sits BEHIND the card; the card slides left to reveal it. */}
      <View className="absolute inset-0 flex-row justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={confirm}
          className="w-20 items-center justify-center bg-loss active:bg-loss-text"
        >
          <Icon name="trash-2" size={20} className="text-ink-primary" />
          <Text className="mt-1 font-display text-[11px] text-ink-primary">
            Delete
          </Text>
        </Pressable>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>{children({ isOpen, close })}</Animated.View>
      </GestureDetector>
    </View>
  );
};

export default SwipeToDelete;
