import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMatch } from '@/contexts/matchContext';

/**
 * The line splitting the two player halves. For a Bo3 the series cells sit
 * *in* the line, point-to-point, so the run reads as one continuous chain —
 * honeycomb rather than three dots floating on a rule.
 *
 * Cell states: the game being played is filled and glows, decided games are
 * solid ink, and games not yet reached are drawn as empty outlines — the comb
 * is visible from the start, then fills in as the round is played.
 */

// Design tokens as raw values: these are style props (border colors, shadows),
// which can't take NativeWind classes. Mirrors tailwind.config.js 1:1.
const BACKGROUND = '#0D1B2A';
// The board's outlines all sit on ink-tertiary, not the dimmer `border` token —
// against the near-black play field a hairline that faint reads as noise rather
// than structure.
const INK_TERTIARY = '#5E6788';
const INK_PRIMARY = '#E4E5F2';
const ACCENT = '#8B93D9';
const ACCENT_SOFT = '#A6ADE6';

// Cell geometry. A hexagon = a body rectangle with a triangular point at each
// end; the points are what let neighbours interlock with no gap.
const H = 14; // cell height
const POINT = 8; // width of each end point
const BODY = 14; // width of the flat middle
const STROKE = 1.5; // outline thickness

// A slow breath. Brighter than a hint — the players need to find it across the
// table — but slow enough that it never pulls the eye mid-game.
const GLOW_MS = 2200;
const GLOW_MIN = 0.45;
const GLOW_MAX = 0.95;

type PipState = 'done' | 'live' | 'upcoming';

// [outline, fill] per state. `upcoming` is hollow: the board shows through it.
const CELL_COLORS: Record<PipState, { outline: string; fill: string }> = {
  done: { outline: INK_PRIMARY, fill: INK_PRIMARY },
  live: { outline: ACCENT_SOFT, fill: ACCENT },
  upcoming: { outline: INK_TERTIARY, fill: BACKGROUND },
};

/**
 * One hexagon in a single color. React Native has no polygon primitive, so the
 * points are drawn with the border trick: a zero-size view whose transparent
 * top/bottom borders and colored side border render as a triangle.
 */
const Hexagon = ({
  color,
  height,
  point,
  body,
}: {
  color: string;
  height: number;
  point: number;
  body: number;
}) => (
  <View className="flex-row items-center">
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: height / 2,
        borderBottomWidth: height / 2,
        borderRightWidth: point,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: color,
      }}
    />
    <View style={{ width: body, height, backgroundColor: color }} />
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: height / 2,
        borderBottomWidth: height / 2,
        borderLeftWidth: point,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
      }}
    />
  </View>
);

/**
 * A cell: an outline hexagon with a slightly smaller fill hexagon centered on
 * top, which is how the shape gets a stroke without a polygon API. The live
 * cell also carries the glow — cast from the layer, so it follows the hexagon
 * rather than a bounding box.
 */
const Cell = ({ state }: { state: PipState }) => {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (state !== 'live') {
      glow.value = 0;
      return;
    }
    glow.value = withRepeat(
      withTiming(1, { duration: GLOW_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [state, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: GLOW_MIN + glow.value * (GLOW_MAX - GLOW_MIN),
    shadowRadius: 6 + glow.value * 8,
  }));

  const { outline, fill } = CELL_COLORS[state];

  return (
    <Animated.View
      style={
        state === 'live'
          ? [
              { shadowColor: ACCENT_SOFT, shadowOffset: { width: 0, height: 0 } },
              glowStyle,
            ]
          : undefined
      }
    >
      <Hexagon color={outline} height={H} point={POINT} body={BODY} />
      <View className="absolute inset-0 items-center justify-center">
        {/* The fill is inset on height and body to leave a stroke, but keeps the
            FULL point length. Shortening the point too left a fat solid wedge at
            each tip — on a hollow cell that reads as a little filled triangle
            detached from the outline, which is not a stroke, it's a blob. */}
        <Hexagon
          color={fill}
          height={H - STROKE * 2}
          point={POINT}
          body={BODY - STROKE}
        />
      </View>
    </Animated.View>
  );
};

// `flex-1` here fills the divider ROW horizontally. It only behaves as a line
// inside the row wrapper below — returned bare into the board's column it grows
// vertically instead and eats a third of the screen.
const Line = () => <View className="h-0.5 flex-1 bg-ink-tertiary" />;

const BoardDivider = () => {
  const { match } = useMatch();
  if (!match) return null;

  // One cell per game the format allows — not per game played, so a Bo3 shows
  // all three slots from the start.
  const cells: PipState[] = Array.from({ length: match.bestOf }, (_, i) => {
    if (match.games[i]?.endedAt != null) return 'done';
    return i === match.currentGameIndex ? 'live' : 'upcoming';
  });

  // Always a row, so the line lays out horizontally in both formats. A Bo1 is
  // just the unbroken line; a Bo3 breaks it around the comb. The cells butt
  // straight up against each other and against the line — no gaps — so the
  // whole divider reads as one connected run.
  return (
    <View className="flex-row items-center">
      <Line />
      {match.bestOf > 1 && (
        <>
          <View className="flex-row items-center">
            {cells.map((state, i) => (
              <Cell key={i} state={state} />
            ))}
          </View>
          <Line />
        </>
      )}
    </View>
  );
};

export default BoardDivider;
