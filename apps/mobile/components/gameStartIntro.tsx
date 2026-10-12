import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useMatch } from '@/contexts/matchContext';
import { formatClock } from '@/lib/clock';

/**
 * The "VS" transition at the start of a game — from the Claude Design file
 * (Riftlog.dc.html, "MATCH-START ANIMATION"): your card slides in from the
 * left and the opponent's from the right, "VS" pops in between, then the label
 * and the format line. ~2s, tap to skip. Plays at match start ("Match
 * start") and before each further game of a Bo3 ("Game 2", "Game 3").
 *
 * Laid out a quarter turn (-90°), like the board clock: the phone lies flat
 * between two players at opposite ends, so sideways text reads equally for
 * both — and your card lands at your end (bottom), the opponent's at theirs.
 *
 * Shown once per game, and only for a game that has JUST started (no points
 * yet, started under a few seconds ago) — so restoring an interrupted match,
 * or any re-render, never replays it.
 */

// The design's 1.75s plus a quarter second, so both players have time to read it.
const SHOW_MS = 2000;
/** A game older than this when the board mounts is a restore, not a start. */
const FRESH_MS = 3000;

// Card gradient colors: LinearGradient takes color props, not classes. These
// mirror the `elevated` → `surface` tokens in tailwind.config.js.
const CARD_GRADIENT = ['#222D47', '#18223A'] as const;
// The design's accent glow under your card (`0 12px 30px -10px` accent @ .5),
// as a style object per the shadow rule in apps/mobile/CLAUDE.md.
const YOU_GLOW = {
  shadowColor: '#8B93D9', // accent
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.5,
  shadowRadius: 22,
} as const;

// cubic-bezier(.2,.8,.2,1) — the design's card slide easing.
const SLIDE_EASE = Easing.bezierFn(0.2, 0.8, 0.2, 1);

const initialOf = (s: string | undefined | null): string =>
  (s ?? '').trim().charAt(0).toUpperCase() || '?';

/** One side's card: the design's vsL (left) / vsR (right). */
const SideCard = ({
  side,
  initial,
  name,
}: {
  side: 'left' | 'right';
  initial: string;
  name: string;
}) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 500, easing: Easing.linear });
  }, [t]);

  const dir = side === 'left' ? -1 : 1;
  const style = useAnimatedStyle(() => {
    const p = SLIDE_EASE(t.value);
    return {
      // Fully visible by 60% of the slide, like the keyframe.
      opacity: interpolate(t.value, [0, 0.6, 1], [0, 1, 1]),
      transform: [
        { translateX: dir * 110 * (1 - p) },
        { rotate: `${dir * 8 * (1 - p)}deg` },
      ],
    };
  });

  const you = side === 'left';
  return (
    <Animated.View style={style} className="items-center gap-3.5">
      <View style={you ? YOU_GLOW : undefined} className="rounded-[20px]">
        {/* Size, radius and border live on a plain View: NativeWind doesn't
            map classNames onto third-party native components (see the
            BlurView note in CLAUDE.md), so the gradient just fills it. */}
        <View
          className={`h-[162px] w-[120px] items-center justify-center overflow-hidden rounded-[20px] border-2 ${
            you ? 'border-accent' : 'border-border'
          }`}
        >
          <LinearGradient
            colors={CARD_GRADIENT}
            start={{ x: 0.25, y: 0 }}
            end={{ x: 0.75, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text
            className={`font-display-bold text-[46px] ${
              you ? 'text-accent' : 'text-ink-primary'
            }`}
          >
            {initial}
          </Text>
        </View>
      </View>
      <Text
        className="max-w-[180px] font-display text-[17px] text-ink-secondary"
        numberOfLines={1}
      >
        {name}
      </Text>
    </Animated.View>
  );
};

const IntroOverlay = ({
  youInitial,
  youName,
  oppInitial,
  oppName,
  label,
  format,
  onSkip,
}: {
  youInitial: string;
  youName: string;
  oppInitial: string;
  oppName: string;
  label: string;
  format: string;
  onSkip: () => void;
}) => {
  const fade = useSharedValue(0); // fadeIn .2s
  const vs = useSharedValue(0); // vsPop 1.1s
  const lbl = useSharedValue(0); // startLabel 1.3s
  const fmt = useSharedValue(0); // fadeIn 1.4s

  useEffect(() => {
    fade.value = withTiming(1, { duration: 200 });
    vs.value = withTiming(1, { duration: 1100, easing: Easing.linear });
    lbl.value = withTiming(1, { duration: 1300, easing: Easing.linear });
    fmt.value = withTiming(1, { duration: 1400, easing: Easing.ease });
  }, [fade, vs, lbl, fmt]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  // Hidden until 55%, overshoots to 1.15 at 75%, settles at 1.
  const vsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(vs.value, [0, 0.55, 0.75, 1], [0, 0, 1, 1]),
    transform: [
      { scale: interpolate(vs.value, [0, 0.55, 0.75, 1], [0.4, 0.4, 1.15, 1]) },
    ],
  }));
  // Hidden until 70%; rises 8px and tightens .5em → .28em (at 24px).
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(lbl.value, [0, 0.7, 1], [0, 0, 1]),
    transform: [{ translateY: interpolate(lbl.value, [0, 1], [8, 0]) }],
    letterSpacing: interpolate(lbl.value, [0, 1], [12, 6.7]),
  }));
  const formatStyle = useAnimatedStyle(() => ({ opacity: fmt.value }));
  // Rotation is paint-only, so the content is laid out at the screen's
  // landscape size (long side as width) before it's turned.
  const { width, height } = useWindowDimensions();

  return (
    <Animated.View
      exiting={FadeOut.duration(150)}
      style={overlayStyle}
      className="absolute inset-0 z-50"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${youName} versus ${oppName}. Tap to skip`}
        onPress={onSkip}
        className="flex-1 items-center justify-center bg-background"
      >
        <View
          style={{
            width: height,
            height: width,
            transform: [{ rotate: '-90deg' }],
          }}
          className="items-center justify-center"
        >
          <View className="mb-[44px] flex-row items-center gap-[34px]">
            <SideCard side="left" initial={youInitial} name={youName} />
            <Animated.Text
              style={vsStyle}
              className="font-mono text-[40px] text-ink-secondary"
            >
              VS
            </Animated.Text>
            <SideCard side="right" initial={oppInitial} name={oppName} />
          </View>
          <Animated.Text
            style={labelStyle}
            className="font-display-bold text-[24px] uppercase text-ink-primary"
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
          <Animated.Text
            style={formatStyle}
            className="mt-3 text-[16px] text-ink-secondary"
          >
            {format}
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

/** Mount over the play field; shows the intro when a game has just begun. */
const GameStartIntro = () => {
  const { match } = useMatch();
  const game = match?.games[match.currentGameIndex] ?? null;
  const [showingFor, setShowingFor] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const gameId = game?.id ?? null;
  const fresh =
    game !== null &&
    game.endedAt === null &&
    (game.events?.length ?? 0) === 0 &&
    Date.now() - Date.parse(game.startedAt) < FRESH_MS;

  useEffect(() => {
    if (!gameId || !fresh || seen.current.has(gameId)) return;
    seen.current.add(gameId);
    setShowingFor(gameId);
    const timer = setTimeout(() => setShowingFor(null), SHOW_MS);
    return () => clearTimeout(timer);
    // `fresh` is read once when the game id changes; it isn't a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (!match || !game || showingFor !== game.id) return null;

  const [p1, p2] = match.players;
  const legend = p1?.deck?.list.legend?.name;
  const n = match.currentGameIndex + 1;
  const format =
    `Best of ${match.bestOf}` +
    (match.timeLimitSeconds != null
      ? ` · ${formatClock(match.timeLimitSeconds)} clock`
      : '');

  return (
    <IntroOverlay
      youInitial={initialOf(legend ?? p1?.name)}
      youName={p1?.name ?? 'You'}
      oppInitial={initialOf(p2?.name)}
      oppName={p2?.name ?? 'Opponent'}
      label={n === 1 ? 'Match start' : `Game ${n}`}
      format={format}
      onSkip={() => setShowingFor(null)}
    />
  );
};

export default GameStartIntro;
