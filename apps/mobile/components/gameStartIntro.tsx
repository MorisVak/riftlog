import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatch } from '@/contexts/matchContext';
import { formatClock } from '@/lib/clock';
import { splitCardName, type CardRef } from '@riftlog/core';
import { LegendPortrait } from '@/components/deck/cardArt';

/**
 * The "VS" transition at the start of a game: both legends slide in from the
 * sides — yours from the left, theirs from the right — and meet at a slanted
 * cut, like the match detail's versus banner; "VS" pops at the cut; each
 * side's champion and player name settle in its bottom corner; the label
 * ("Match start" / "Game 2") and the format sit at the top. A player with
 * no legend gets their initial, large and faint. ~2s, tap to skip.
 *
 * Laid out a quarter turn (-90°), like the board clock: the phone lies flat
 * between two players at opposite ends, so sideways text reads equally for
 * both — and your side lands at your end (bottom), the opponent's at theirs.
 *
 * Shown once per game, and only for a game that has JUST started (no points
 * yet, started under a few seconds ago) — so restoring an interrupted match,
 * or any re-render, never replays it.
 */

const SHOW_MS = 2200;
/** A game older than this when the board mounts is a restore, not a start. */
const FRESH_MS = 3000;

// cubic-bezier(.2,.8,.2,1) — the slide easing.
const SLIDE_EASE = Easing.bezierFn(0.2, 0.8, 0.2, 1);
/** The slant of the cut between the two sides (as on the match detail). */
const CUT = 11;

// `background` (tailwind.config.js) mirrored for gradient stops: the shades
// behind the top label and the bottom names.
const SHADE_TOP = ['#0D1B2AF5', '#0D1B2ACC', '#0D1B2A00'] as const;
const SHADE_BOTTOM = ['#0D1B2A00', '#0D1B2AD9', '#0D1B2AFA'] as const;
const SHADE_VS = ['#0D1B2A00', '#0D1B2AB3', '#0D1B2A00'] as const;
// A soft dark halo under text that sits over art (a style object, like the
// shadow rule in apps/mobile/CLAUDE.md asks; `background` mirrored).
const TEXT_HALO = {
  textShadowColor: '#0D1B2A',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const;

const initialOf = (s: string | undefined | null): string =>
  (s ?? '').trim().charAt(0).toUpperCase() || '?';

/** A side's art: the legend (face crop), or the player's initial, faint. */
const SideArt = ({ legend, initial }: { legend: CardRef | null; initial: string }) =>
  legend ? (
    <LegendPortrait card={legend} />
  ) : (
    <View className="absolute inset-0 items-center justify-center bg-elevated">
      <Text className="font-display-bold text-[120px] text-border">{initial}</Text>
    </View>
  );

/** A side's names in its bottom corner: the champion, then the player. */
const SideName = ({
  legend,
  name,
  align,
}: {
  legend: CardRef | null;
  name: string;
  align: 'left' | 'right';
}) => (
  <View className={`flex-1 ${align === 'right' ? 'items-end' : ''}`}>
    {legend && (
      <Text
        style={TEXT_HALO}
        className="font-display-bold text-[32px] text-ink-primary"
        numberOfLines={1}
      >
        {splitCardName(legend.name).head}
      </Text>
    )}
    <Text
      style={TEXT_HALO}
      className={
        legend
          ? 'font-display text-[20px] text-ink-primary/85'
          : 'font-display-bold text-[28px] text-ink-primary'
      }
      numberOfLines={1}
    >
      {name}
    </Text>
  </View>
);

const IntroOverlay = ({
  you,
  opponent,
  label,
  format,
  onSkip,
}: {
  you: { name: string; legend: CardRef | null };
  opponent: { name: string; legend: CardRef | null };
  label: string;
  format: string;
  onSkip: () => void;
}) => {
  const fade = useSharedValue(0);
  const slide = useSharedValue(0);
  const vs = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 150 });
    slide.value = withTiming(1, { duration: 600, easing: Easing.linear });
    vs.value = withTiming(1, { duration: 1000, easing: Easing.linear });
    text.value = withTiming(1, { duration: 1300, easing: Easing.linear });
  }, [fade, slide, vs, text]);

  // Rotation is paint-only, so the content is laid out at the screen's
  // landscape size (long side as width) before it's turned. A phone already
  // held in landscape needs no turn.
  const { width, height } = useWindowDimensions();
  const W = Math.max(width, height);
  const landscape = width > height;
  // The names' corners must clear the notch / status bar / home indicator.
  // Turned, the box's left and right ends are the screen's bottom and top;
  // the same inset on both keeps the two names mirrored, a bit in from it.
  const insets = useSafeAreaInsets();
  const edge =
    (landscape
      ? Math.max(insets.left, insets.right)
      : Math.max(insets.top, insets.bottom)) + 28;
  const bottom = (landscape ? insets.bottom : 0) + 24;

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -W * 0.6 * (1 - SLIDE_EASE(slide.value)) }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: W * 0.6 * (1 - SLIDE_EASE(slide.value)) },
      { rotate: `${CUT}deg` },
    ],
  }));
  // Hidden until the sides meet, overshoots to 1.2, settles at 1.
  const vsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(vs.value, [0, 0.5, 0.7, 1], [0, 0, 1, 1]),
    transform: [{ scale: interpolate(vs.value, [0, 0.5, 0.7, 1], [0.4, 0.4, 1.2, 1]) }],
  }));
  // The names, label and format fade in and rise once the sides are in.
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(text.value, [0, 0.55, 0.85], [0, 0, 1]),
    transform: [{ translateY: interpolate(text.value, [0, 0.55, 0.85], [10, 10, 0], 'clamp') }],
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(150)}
      style={overlayStyle}
      className="absolute inset-0 z-50"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${you.name} versus ${opponent.name}. Tap to skip`}
        onPress={onSkip}
        className="flex-1 items-center justify-center bg-background"
      >
        <View
          style={
            landscape
              ? { width, height }
              : { width: height, height: width, transform: [{ rotate: '-90deg' }] }
          }
          className="overflow-hidden"
        >
          {/* Yours: the left side, running under theirs at the cut. */}
          <Animated.View style={leftStyle} className="absolute bottom-0 left-0 top-0 w-[58%]">
            <SideArt legend={you.legend} initial={initialOf(you.name)} />
          </Animated.View>

          {/* Theirs: a box three screens tall, turned CUT° around the middle
              of its left edge — the slanted cut — so its edges never show;
              inside, a layer the screen's height turns back around that same
              point, so the art stands upright. A rotation, not a skew:
              Android can't draw skews (the cut came out straight there). The
              art ends at the screen's edge (right-[21%] of a box 67% of the
              screen wide, from 48%), or a face on the art's right (Akali
              VEN-189) was pushed off the screen. */}
          <Animated.View
            style={[rightStyle, { transformOrigin: 'left center' }]}
            className="absolute bottom-[-100%] left-[48%] right-[-15%] top-[-100%] overflow-hidden border-l-4 border-background"
          >
            <View
              style={{ transform: [{ rotate: `-${CUT}deg` }], transformOrigin: 'left center' }}
              className="absolute bottom-[33.333%] left-0 right-0 top-[33.333%]"
            >
              <View className="absolute bottom-0 left-[-10%] right-[21%] top-0">
                <SideArt legend={opponent.legend} initial={initialOf(opponent.name)} />
              </View>
            </View>
          </Animated.View>

          <LinearGradient
            colors={SHADE_TOP}
            locations={[0, 0.55, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%' }}
          />
          <LinearGradient
            colors={SHADE_BOTTOM}
            locations={[0, 0.55, 1]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '52%' }}
          />
          {/* A dark band behind "VS", so it reads over both legends. */}
          <LinearGradient
            colors={SHADE_VS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', top: 0, bottom: 0, left: '35%', width: '30%' }}
          />

          {/* VS at the cut. */}
          <View className="absolute inset-0 items-center justify-center">
            <Animated.Text
              style={[vsStyle, TEXT_HALO]}
              className="font-display-bold text-[72px] text-ink-primary"
            >
              VS
            </Animated.Text>
          </View>

          {/* The label and the format, top centre. */}
          <Animated.View style={textStyle} className="absolute left-0 right-0 top-6 items-center">
            <Text
              style={TEXT_HALO}
              className="font-display-bold text-[26px] uppercase tracking-[6px] text-ink-primary"
              numberOfLines={1}
            >
              {label}
            </Text>
            <Text style={TEXT_HALO} className="mt-1 font-display text-[17px] text-ink-primary/80">
              {format}
            </Text>
          </Animated.View>

          {/* The names in the bottom corners. */}
          <Animated.View
            style={[textStyle, { paddingHorizontal: edge, paddingBottom: bottom }]}
            className="absolute bottom-0 left-0 right-0 flex-row items-end gap-6"
          >
            <SideName legend={you.legend} name={you.name} align="left" />
            <SideName legend={opponent.legend} name={opponent.name} align="right" />
          </Animated.View>
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
  const n = match.currentGameIndex + 1;
  const format =
    `Best of ${match.bestOf}` +
    (match.timeLimitSeconds != null
      ? ` · ${formatClock(match.timeLimitSeconds)} clock`
      : '');

  return (
    <IntroOverlay
      you={{ name: p1?.name ?? 'You', legend: p1?.legend ?? null }}
      opponent={{ name: p2?.name ?? 'Opponent', legend: p2?.legend ?? null }}
      label={n === 1 ? 'Match start' : `Game ${n}`}
      format={format}
      onSkip={() => setShowingFor(null)}
    />
  );
};

export default GameStartIntro;
