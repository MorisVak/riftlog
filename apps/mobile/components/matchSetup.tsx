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
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { MatchConfig } from '@/contexts/matchContext';
import { useMatch } from '@/contexts/matchContext';
import DurationPicker from './durationPicker';
import React, { useState } from 'react';

type MatchSetupProps = {
  onClose: () => void;
};

// ink-secondary token — TextInput's placeholderTextColor is a prop, not a class,
// so it takes the raw value rather than a NativeWind className.
const INK_SECONDARY = '#868FB0';
// background token — Feather's color is a prop; this is the ink used on accent.
const ON_ACCENT = '#0D1B2A';

// Round lengths offered for a timed match, in minutes — the two common ones,
// with anything else set on the custom wheels. One clock covers the whole
// match, so for a Bo3 this is the length of the entire round, not of each game.
const TIME_PRESETS = [30, 60] as const;
/** A preset in minutes, or the custom minutes/seconds picker. */
type TimeChoice = (typeof TIME_PRESETS)[number] | 'custom';
// Where the custom wheels start — a typical tournament round, so the common
// case is a nudge rather than a scroll from zero.
const DEFAULT_CUSTOM = { minutes: 50, seconds: 0 };

// Drag-to-dismiss thresholds: release past this far down, or flick faster than
// this, and the sheet closes; otherwise it springs back to rest.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
// How far the sheet slides off-screen on dismiss before unmounting.
const SHEET_TRAVEL = 520;

/**
 * Pre-match setup sheet. Collects the format (Bo1 / Bo3) and both player names —
 * `p1` is always you, `p2` the opponent — then starts the match with that
 * config. Replaces the old hardcoded startMatch() defaults. Deck selection,
 * timed mode, and turn tracking are deferred to later slices and intentionally
 * omitted.
 */
const MatchSetup = ({ onClose }: MatchSetupProps) => {
  const { startMatch } = useMatch();

  const [bestOf, setBestOf] = useState<1 | 3>(1);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [timed, setTimed] = useState(false);
  const [choice, setChoice] = useState<TimeChoice>(TIME_PRESETS[0]);
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);

  // The configured clock, in seconds. null when the match isn't timed.
  const timeLimitSeconds = !timed
    ? null
    : choice === 'custom'
      ? custom.minutes * 60 + custom.seconds
      : choice * 60;
  // A timed match needs an actual duration — 00:00 on the wheels is not a round.
  const startable = timeLimitSeconds === null || timeLimitSeconds > 0;

  const pickFormat = (value: 1 | 3) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBestOf(value);
  };

  const toggleTimed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimed((on) => !on);
  };

  const pickChoice = (value: TimeChoice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChoice(value);
  };

  const start = () => {
    if (!startable) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const config: MatchConfig = {
      bestOf,
      playerNames: [p1Name, p2Name],
      timeLimitSeconds,
    };
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

  const timeButton = (value: TimeChoice, label: string) => {
    const selected = choice === value;
    return (
      <TouchableOpacity
        key={String(value)}
        onPress={() => pickChoice(value)}
        className={`flex-1 items-center rounded-xl border px-2 py-2.5 ${
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
        <Animated.View
          style={sheetStyle}
          className="rounded-t-3xl border-t border-border bg-surface px-5 pb-8 pt-2"
        >
          {/* Drag-to-dismiss is scoped to the grab handle and title rather than
              the whole sheet: the custom-time wheels scroll vertically, and a
              sheet-wide pan would swallow that drag and dismiss instead. */}
          <GestureDetector gesture={pan}>
            <View>
              <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <Text className="mb-5 font-display-bold text-xl text-ink-primary">
                New match
              </Text>
            </View>
          </GestureDetector>

          <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
            Format
          </Text>
          <View className="mb-5 flex-row gap-2">
            {formatButton(1, 'Best of 1')}
            {formatButton(3, 'Best of 3')}
          </View>

          {/* Timed match. One clock covers the whole match — for a Bo3 the
              preset is the length of the round, not of each game — and it keeps
              running through the between-games break (sideboarding is on the
              clock) and past zero into overtime. */}
          <TouchableOpacity
            onPress={toggleTimed}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: timed }}
            className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${
              timed
                ? 'mb-3 border-accent bg-elevated'
                : 'mb-5 border-border bg-elevated active:bg-surface'
            }`}
          >
            <View
              className={`h-6 w-6 items-center justify-center rounded-md border ${
                timed ? 'border-accent bg-accent' : 'border-border bg-surface'
              }`}
            >
              {timed && <Feather name="check" size={15} color={ON_ACCENT} />}
            </View>
            <View className="flex-1">
              <Text className="font-display text-base text-ink-primary">
                Timed match
              </Text>
              <Text className="mt-0.5 text-xs text-ink-secondary">
                One clock for the whole match — it runs between games too.
              </Text>
            </View>
          </TouchableOpacity>

          {timed && (
            <Animated.View entering={FadeIn.duration(160)} className="mb-5">
              <View className="flex-row gap-2">
                {TIME_PRESETS.map((m) => timeButton(m, `${m} min`))}
                {timeButton('custom', 'Custom')}
              </View>

              {choice === 'custom' && (
                <Animated.View entering={FadeIn.duration(160)} className="mt-2">
                  <DurationPicker
                    minutes={custom.minutes}
                    seconds={custom.seconds}
                    onChange={setCustom}
                  />
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* Asymmetric on purpose: p1 is always the device owner ("you"), and
              history derives win/loss and the "vs" label from that. Symmetric
              "Player 1 / Player 2" fields made it easy to enter yourself second
              and invert every result. */}
          <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
            You
          </Text>
          <TextInput
            value={p1Name}
            onChangeText={setP1Name}
            placeholder="Your name"
            placeholderTextColor={INK_SECONDARY}
            returnKeyType="next"
            className="mb-4 rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary"
          />
          <Text className="mb-2 font-display text-xs uppercase tracking-wider text-ink-secondary">
            Opponent
          </Text>
          <TextInput
            value={p2Name}
            onChangeText={setP2Name}
            placeholder="Opponent name"
            placeholderTextColor={INK_SECONDARY}
            returnKeyType="done"
            className="mb-6 rounded-xl border border-border bg-elevated px-4 py-3 text-base text-ink-primary"
          />

          {/* Disabled only for the one unstartable state: a timed match set to
              00:00. The label says why rather than leaving a dead button. */}
          <TouchableOpacity
            onPress={start}
            disabled={!startable}
            className={`items-center rounded-full px-5 py-4 ${
              startable
                ? 'bg-accent shadow-accent-btn active:bg-accent-strong'
                : 'bg-elevated'
            }`}
          >
            <Text
              className={`font-display-bold text-base ${
                startable ? 'text-background' : 'text-ink-tertiary'
              }`}
            >
              {startable ? 'Start match' : 'Set a time first'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default MatchSetup;
