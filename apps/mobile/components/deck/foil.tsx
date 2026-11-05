import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * The foil sheen on rare-and-better card art, as on Piltover Archive: a
 * rainbow band three times the card's size, blended with `color-dodge` over
 * the art, sliding across and back (3 s each way). Purely decorative; with
 * Reduce Motion on it stands still.
 */

/** Rarities that get the foil: Rare and better. */
const FOILED = new Set(['rare', 'epic', 'showcase']);

export const isFoiled = (rarity: string | null): boolean =>
  rarity !== null && FOILED.has(rarity.toLowerCase());

// The `foil` tokens in tailwind.config.js at 25% alpha (gradient stops can't
// take a class).
const CLEAR = '#00000000';
const STOPS = [CLEAR, '#FF008040', '#FFC80040', '#00FF8040', '#00C8FF40', '#8000FF40', '#FF008040', CLEAR] as const;
const LOCATIONS = [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 1] as const;

const HALF_CYCLE_MS = 3000;

const Foil = ({ width, height }: { width: number; height: number }) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: HALF_CYCLE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduceMotion, progress]);

  // background-position 0% → 100% on a 300% band: its left edge travels
  // from the card's left edge to two card-widths left of it.
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: -2 * width * progress.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={{ mixBlendMode: 'color-dodge', opacity: 0.6 }}
      className="absolute inset-0"
    >
      <Animated.View style={[{ position: 'absolute', left: 0, top: -height, width: width * 3, height: height * 3 }, slide]}>
        {/* 125°, as in the CSS: down and to the right. */}
        <LinearGradient
          colors={STOPS}
          locations={LOCATIONS}
          start={{ x: 0.09, y: 0.21 }}
          end={{ x: 0.91, y: 0.79 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

export default Foil;
