import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import type { MatchConfig } from '@/contexts/matchContext';
import { useMatch } from '@/contexts/matchContext';
import React, { useState } from 'react';

type MatchSetupProps = {
  onClose: () => void;
};

// ink-secondary token — TextInput's placeholderTextColor is a prop, not a class,
// so it takes the raw value rather than a NativeWind className.
const INK_SECONDARY = '#868FB0';

// Drag-to-dismiss thresholds: release past this far down, or flick faster than
// this, and the sheet closes; otherwise it springs back to rest.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
// How far the sheet slides off-screen on dismiss before unmounting.
const SHEET_TRAVEL = 520;

/**
 * Pre-match setup sheet. Collects the format (Bo1 / Bo3) and both player names,
 * then starts the match with that config. Replaces the old hardcoded
 * startMatch() defaults. Deck selection, timed mode, and turn tracking are
 * deferred to later slices and intentionally omitted.
 */
const MatchSetup = ({ onClose }: MatchSetupProps) => {
  const { startMatch } = useMatch();

  const [bestOf, setBestOf] = useState<1 | 3>(1);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');

  const pickFormat = (value: 1 | 3) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBestOf(value);
  };

  const start = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const config: MatchConfig = { bestOf, playerNames: [p1Name, p2Name] };
    startMatch(config);
    onClose();
  };

  const cancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Drag-to-dismiss. The sheet follows the finger downward (never up), and the
  // backdrop fades as it goes so the two feel connected. Release past the
  // threshold (or with enough downward velocity) and it slides off and closes;
  // otherwise it springs back to rest.
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(translateY.value / SHEET_TRAVEL, 1),
  }));

  const pan = Gesture.Pan()
    .activeOffsetY(10) // only a downward drag activates; taps/typing pass through
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, startY.value + e.translationY);
    })
    .onEnd((e) => {
      if (translateY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(SHEET_TRAVEL, { duration: 200 }, () => {
          runOnJS(cancel)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  const formatButton = (value: 1 | 3, label: string) => {
    const selected = bestOf === value;
    return (
      <TouchableOpacity
        onPress={() => pickFormat(value)}
        className={`flex-1 items-center rounded-xl border px-3 py-3 ${
          selected
            ? 'border-accent bg-accent'
            : 'border-border bg-elevated active:bg-surface'
        }`}
      >
        <Text
          className={`font-display text-sm ${
            selected ? 'text-background' : 'text-ink-secondary'
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="absolute inset-0 z-50">
      <TouchableWithoutFeedback onPress={cancel}>
        <Animated.View
          style={backdropStyle}
          className="absolute inset-0 bg-background/80"
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            style={sheetStyle}
            className="rounded-t-3xl border-t border-border bg-surface px-5 pb-8 pt-2"
          >
            <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

          <Text className="mb-5 font-display-bold text-xl text-ink-primary">
            New match
          </Text>

          <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
            Format
          </Text>
          <View className="mb-5 flex-row gap-2">
            {formatButton(1, 'Best of 1')}
            {formatButton(3, 'Best of 3')}
          </View>

          <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
            Players
          </Text>
          <TextInput
            value={p1Name}
            onChangeText={setP1Name}
            placeholder="Player 1"
            placeholderTextColor={INK_SECONDARY}
            returnKeyType="next"
            className="mb-2 rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary"
          />
          <TextInput
            value={p2Name}
            onChangeText={setP2Name}
            placeholder="Player 2"
            placeholderTextColor={INK_SECONDARY}
            returnKeyType="done"
            className="mb-6 rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary"
          />

          <TouchableOpacity
            onPress={start}
            className="items-center rounded-full bg-accent px-5 py-4 shadow-accent-btn active:bg-accent-strong"
          >
            <Text className="font-display-bold text-base text-background">
              Start match
            </Text>
          </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
};

export default MatchSetup;
