import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { splitCardName, type CardRef } from '@riftlog/core';
import type { MatchConfig } from '@/contexts/matchContext';
import { useMatch } from '@/contexts/matchContext';
import { useAuth } from '@/contexts/authContext';
import { useProfile } from '@/contexts/profileContext';
import { toDeckSnapshot, type Deck } from '@/lib/decks';
import DeckPicker from './deck/deckPicker';
import { LegendPortrait } from './deck/cardArt';
import { LegendSheet, useLegends } from './match/legendPicker';
import DurationPicker from './durationPicker';
import Icon from './icon';
import PressOverlay from './pressOverlay';
import { CTA_GLOW } from './ctaGlow';

type MatchSetupProps = {
  onClose: () => void;
};

// Round lengths offered for a timed match, in minutes, plus Off and Custom.
// One clock covers the whole match, so for a Bo3 this is the whole round.
const TIME_PRESETS = [30, 60] as const;
type Clock = 'off' | (typeof TIME_PRESETS)[number] | 'custom';
// Where the custom wheels start — a typical tournament round.
const DEFAULT_CUSTOM = { minutes: 50, seconds: 0 };

// `background` (tailwind.config.js), clear → nearly opaque: the shade under a
// portrait's name. Gradient stops can't take a class.
const SHADE = ['#0D1B2A00', '#0D1B2AF2'] as const;

// Slide in / out, and how far (or fast) a drag on the handle must go to close.
const ENTER_MS = 320;
// The custom clock's wheels opening / closing (and the sheet with them).
const REVEAL_MS = 300;
const EXIT_MS = 220;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

const PORTRAIT_H = 196;
const VS_SIZE = 40;

/**
 * One side of the matchup: the legend's art (cropped on its face) with the
 * side ("You" / "Opponent") and the legend's name, or an empty slot asking
 * for one. The whole portrait is the button.
 */
const Portrait = ({
  side,
  legend,
  caption,
  emptyLabel,
  emptyHint,
  onPress,
}: {
  side: string;
  legend: CardRef | null;
  /** A small line under the legend's name, e.g. "From Rivon". */
  caption?: string;
  emptyLabel: string;
  emptyHint: string;
  onPress: () => void;
}) => {
  const name = legend ? splitCardName(legend.name) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${side}: ${legend ? legend.name : emptyLabel}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{ height: PORTRAIT_H }}
      className={`relative overflow-hidden rounded-2xl border ${
        legend ? 'border-border bg-elevated' : 'border-dashed border-border bg-surface'
      }`}
    >
      {({ pressed }) => (
        <>
          {legend && <LegendPortrait card={legend} />}
          {legend && (
            <LinearGradient
              colors={SHADE}
              locations={[0.35, 1]}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
          )}
          <View className="absolute left-2.5 top-2.5 rounded-full bg-background/70 px-2.5 py-1">
            <Text className="font-display text-[11px] text-ink-primary">{side}</Text>
          </View>
          {name ? (
            <View className="absolute bottom-0 left-0 right-0 px-3 pb-3">
              <Text className="font-display-bold text-[18px] text-ink-primary" numberOfLines={1}>
                {name.head}
              </Text>
              {name.title !== '' && (
                <Text className="text-[12px] text-ink-secondary" numberOfLines={1}>
                  {name.title}
                </Text>
              )}
              {caption && (
                <Text className="mt-1 text-[11px] text-ink-tertiary" numberOfLines={1}>
                  {caption}
                </Text>
              )}
            </View>
          ) : (
            <View className="absolute inset-0 items-center justify-center gap-1.5 px-3">
              <Icon name="plus-circle" size={24} className="text-ink-secondary" />
              <Text className="text-center font-display text-[14px] text-ink-primary">
                {emptyLabel}
              </Text>
              <Text className="text-center text-[11px] text-ink-tertiary">{emptyHint}</Text>
            </View>
          )}
          <PressOverlay pressed={pressed} />
        </>
      )}
    </Pressable>
  );
};

/** A row of equal buttons, one selected (format, clock). */
const Segmented = <T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <View className="flex-row gap-2">
    {options.map((o) => {
      const selected = o.value === value;
      return (
        <TouchableOpacity
          key={String(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => {
            if (selected) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(o.value);
          }}
          className={`flex-1 items-center rounded-xl border py-3 ${
            selected ? 'border-accent bg-accent' : 'border-border bg-elevated'
          }`}
        >
          <Text
            className={`font-display text-sm ${selected ? 'text-background' : 'text-ink-secondary'}`}
          >
            {o.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/**
 * Content that opens and closes by animating its height (0 ↔ its measured
 * height). The setup sheet is as tall as its content, so it slides up and
 * down with it, frame by frame.
 */
const Reveal = ({ open, children }: { open: boolean; children: React.ReactNode }) => {
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: REVEAL_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, progress]);
  const style = useAnimatedStyle(
    () => ({ height: height * progress.value, opacity: progress.value }),
    [height],
  );
  return (
    <Animated.View
      style={[style, { overflow: 'hidden' }]}
      pointerEvents={open ? 'auto' : 'none'}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      {/* Absolute, so it keeps its natural height to measure. */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
};

const Label = ({
  children,
  hint,
  action,
}: {
  children: string;
  hint?: string;
  /** A small text button on the right instead of the hint, e.g. "Clear". */
  action?: { label: string; a11y: string; onPress: () => void };
}) => (
  <View className="mb-2 flex-row items-baseline justify-between">
    <Text className="font-display text-base text-ink-secondary">{children}</Text>
    {action ? (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={action.a11y}
        onPress={action.onPress}
        hitSlop={10}
      >
        <Text className="font-display text-[13px] text-accent">{action.label}</Text>
      </TouchableOpacity>
    ) : (
      hint && <Text className="text-xs text-ink-tertiary">{hint}</Text>
    )}
  </View>
);

/**
 * Pre-match setup: a bottom sheet over everything (a transparent Modal, so
 * the tab bar is covered too), as tall as its content — it grows smoothly
 * when the custom-time wheels open — and never past the status bar (the
 * content scrolls). Drag the handle down, tap outside or ✕ to close. Built
 * around the matchup —
 * your legend and theirs side by side (you left: you're p1), each a portrait
 * you tap to choose, with the names under them. Then your deck (signed in,
 * optional, with "Clear"; a deck supplies your legend — picking a different
 * legend on your portrait drops the deck), the format and the clock. Start is pinned at the bottom and
 * says what's missing: their legend is required whenever the catalog is
 * loaded (so History can show it); a custom clock can't be 00:00.
 *
 * `p1` is always you, `p2` the opponent — asymmetric on purpose, since
 * history derives win/loss and the "vs" label from p1. Turn tracking is
 * still deferred.
 */
const MatchSetup = ({ onClose }: MatchSetupProps) => {
  const { startMatch } = useMatch();
  // Decks are an account feature; a guest has none and their match isn't saved.
  const { status } = useAuth();
  const signedIn = status === 'authed';
  // Your default deck (Profile) is pre-selected; you can still change it.
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();

  const [bestOf, setBestOf] = useState<1 | 3>(1);
  const [p1Name, setP1Name] = useState(signedIn ? (profile?.displayName ?? '') : '');
  const [p2Name, setP2Name] = useState('');
  const [clock, setClock] = useState<Clock>('off');
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [opponentLegend, setOpponentLegend] = useState<CardRef | null>(null);
  // Your legend without a deck (one you haven't uploaded yet). Optional; a
  // chosen deck's legend wins.
  const [yourLegend, setYourLegend] = useState<CardRef | null>(null);
  const [sheet, setSheet] = useState<'you' | 'them' | null>(null);
  // Custom opens the wheels at the very bottom; on a short screen, where the
  // sheet is already at its tallest, scroll them into view once they're open.
  const scroll = useRef<ScrollView>(null);
  const pickClock = (c: Clock) => {
    setClock(c);
    if (c === 'custom') {
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), REVEAL_MS);
    }
  };

  const deckChosen = signedIn && deck !== null;
  const shownYourLegend = deckChosen ? (deck?.list.legend ?? null) : yourLegend;
  // Required — unless there's no catalog to pick from (first launch offline).
  const legendsAvailable = useLegends().length > 0;
  const needsLegend = legendsAvailable && opponentLegend === null;

  // The configured clock, in seconds. null when the match isn't timed.
  const timeLimitSeconds =
    clock === 'off' ? null : clock === 'custom' ? custom.minutes * 60 + custom.seconds : clock * 60;
  const timeSet = timeLimitSeconds === null || timeLimitSeconds > 0;
  const startable = timeSet && !needsLegend;

  // The sheet slides up on mount and down to close; the backdrop fades with
  // it (its opacity is derived from the same value). Dragging the handle
  // down follows the finger; past a threshold (or a flick) it closes,
  // otherwise it springs back.
  const { height: screenH } = useWindowDimensions();
  const travel = screenH;
  const translateY = useSharedValue(travel);
  const dragStart = useSharedValue(0);
  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateY]);
  const close = () => {
    translateY.value = withTiming(travel, { duration: EXIT_MS }, () => runOnJS(onClose)());
  };
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(translateY.value / (travel * 0.6), 1),
  }));
  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onStart(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, dragStart.value + e.translationY);
    })
    .onEnd((e) => {
      if (translateY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(travel, { duration: EXIT_MS }, () => runOnJS(onClose)());
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });
  // Never taller than the screen below the status bar; the content scrolls.
  const maxSheetH = screenH - insets.top - 8;

  const start = () => {
    if (!startable) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const config: MatchConfig = {
      bestOf,
      playerNames: [p1Name, p2Name],
      timeLimitSeconds,
      deck: deckChosen && deck ? toDeckSnapshot(deck) : null,
      opponentLegend,
      yourLegend: deckChosen ? null : yourLegend,
    };
    startMatch(config);
    // The board replaces Home at once, so no slide-out to wait for.
    onClose();
  };

  const nameInput =
    'h-11 rounded-xl border border-border bg-elevated px-3 text-[15px] text-ink-primary placeholder:text-ink-tertiary';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      {/* Gestures inside a Modal need their own root. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={backdropStyle} className="absolute inset-0 bg-background/80">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            className="flex-1"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          className="flex-1 justify-end"
        >
          {/* Outer: the slide and the drag. Inner: the sheet itself, as tall
              as its content (up to maxSheetH) — so when the custom wheels
              open (`Reveal`), it slides up with them. */}
          <Animated.View style={sheetStyle}>
            <Animated.View
              style={{ maxHeight: maxSheetH }}
              className="overflow-hidden rounded-t-3xl border-t border-border bg-background"
            >
              <GestureDetector gesture={pan}>
                <View className="px-5 pt-2">
                  <View className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
                  <View className="flex-row items-center justify-between">
                    <Text className="font-display-bold text-[26px] tracking-tight text-ink-primary">
                      New match
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      onPress={close}
                      className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated"
                    >
                      <Icon name="x" size={17} className="text-ink-secondary" />
                    </TouchableOpacity>
                  </View>
                </View>
              </GestureDetector>

              <ScrollView
                ref={scroll}
                contentContainerStyle={{
                  padding: 20,
                  paddingTop: 16,
                  paddingBottom: 16,
                }}
                style={{ flexGrow: 0 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* The matchup: you left (p1), them right, VS between. */}
                <View className="relative flex-row gap-3">
                  <View className="flex-1 gap-2">
                    <Portrait
                      side="You"
                      legend={shownYourLegend}
                      caption={deckChosen && deck ? `From ${deck.name}` : undefined}
                      emptyLabel="Your legend"
                      emptyHint={signedIn ? 'Optional · or pick a deck' : 'Optional'}
                      onPress={() => setSheet('you')}
                    />
                    <TextInput
                      value={p1Name}
                      onChangeText={setP1Name}
                      placeholder="Your name"
                      returnKeyType="next"
                      accessibilityLabel="Your name"
                      className={nameInput}
                    />
                  </View>
                  <View className="flex-1 gap-2">
                    <Portrait
                      side="Opponent"
                      legend={opponentLegend}
                      emptyLabel="Their legend"
                      emptyHint={legendsAvailable ? 'Tap to choose' : 'Card list not loaded'}
                      onPress={() => legendsAvailable && setSheet('them')}
                    />
                    <TextInput
                      value={p2Name}
                      onChangeText={setP2Name}
                      placeholder="Opponent name"
                      returnKeyType="done"
                      accessibilityLabel="Opponent name"
                      className={nameInput}
                    />
                  </View>
                  <View
                    pointerEvents="none"
                    style={{
                      width: VS_SIZE,
                      height: VS_SIZE,
                      top: PORTRAIT_H / 2 - VS_SIZE / 2,
                      left: '50%',
                      marginLeft: -VS_SIZE / 2,
                    }}
                    className="absolute items-center justify-center rounded-full border border-border bg-background"
                  >
                    <Text className="font-display-bold text-[13px] text-ink-primary">VS</Text>
                  </View>
                </View>

                {signedIn && (
                  <View className="mt-6">
                    <Label
                      hint="Optional"
                      action={
                        deck
                          ? {
                              label: 'Clear',
                              a11y: 'Clear your deck',
                              onPress: () => {
                                Haptics.selectionAsync();
                                setDeck(null);
                              },
                            }
                          : undefined
                      }
                    >
                      Your deck
                    </Label>
                    <DeckPicker
                      value={deck}
                      onChange={setDeck}
                      defaultDeckId={profile?.defaultDeckId ?? null}
                      preselect
                    />
                  </View>
                )}

                <View className="mt-6">
                  <Label>Format</Label>
                  <Segmented<1 | 3>
                    options={[
                      { value: 1, label: 'Best of 1' },
                      { value: 3, label: 'Best of 3' },
                    ]}
                    value={bestOf}
                    onChange={setBestOf}
                  />
                </View>

                {/* One clock covers the whole match — for a Bo3 the length of the
                round — and keeps running between games and into overtime. */}
                <View className="mt-6">
                  <Label hint={clock === 'off' ? undefined : 'One clock for the whole match'}>
                    Clock
                  </Label>
                  <Segmented<Clock>
                    options={[
                      { value: 'off', label: 'Off' },
                      ...TIME_PRESETS.map((m) => ({
                        value: m,
                        label: `${m} min`,
                      })),
                      { value: 'custom', label: 'Custom' },
                    ]}
                    value={clock}
                    onChange={pickClock}
                  />
                  <Reveal open={clock === 'custom'}>
                    <View className="pt-2">
                      <DurationPicker
                        minutes={custom.minutes}
                        seconds={custom.seconds}
                        onChange={setCustom}
                      />
                    </View>
                  </Reveal>
                </View>
              </ScrollView>

              {/* Pinned, so Start is always in reach. Disabled while something
              required is missing; the label says which. CTA_GLOW, not the
              `shadow-accent-btn` class: toggling that class as the form
              becomes valid throws "Couldn't find a navigation context"
              (apps/mobile/CLAUDE.md, "Shadows"). */}
              <View
                style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
                className="border-t border-border/60 bg-background px-5 pt-3"
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !startable }}
                  onPress={start}
                  disabled={!startable}
                  style={startable ? CTA_GLOW : undefined}
                  className={`items-center rounded-full px-5 py-4 ${
                    startable ? 'bg-accent active:bg-accent-strong' : 'bg-elevated'
                  }`}
                >
                  <Text
                    className={`font-display-bold text-base ${
                      startable ? 'text-background' : 'text-ink-tertiary'
                    }`}
                  >
                    {startable
                      ? 'Start match'
                      : !timeSet
                        ? 'Set a time first'
                        : 'Choose their legend first'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>

        <LegendSheet
          visible={sheet === 'them'}
          onClose={() => setSheet(null)}
          value={opponentLegend}
          onChange={setOpponentLegend}
          title="Their legend"
        />
        <LegendSheet
          visible={sheet === 'you'}
          onClose={() => setSheet(null)}
          value={shownYourLegend}
          onChange={(legend) => {
            // A different legend than the deck's means you're not playing
            // that deck: drop it, so the pick is what gets saved.
            if (deckChosen && legend?.name !== deck?.list.legend?.name) setDeck(null);
            setYourLegend(legend);
          }}
          title="Your legend"
          optional
        />
      </GestureHandlerRootView>
    </Modal>
  );
};

export default MatchSetup;
