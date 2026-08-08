import {
  Easing,
  useAnimatedStyle,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * The shared screen entrance: elements fade in while rising a few px, each one
 * starting slightly after the last, so a screen assembles top-to-bottom instead
 * of appearing all at once (the design's `.scr` / scrIn).
 *
 * Home, History, and Profile all use this. It lives here because the third copy
 * of the same three constants is where they start drifting — same reasoning as
 * `components/matchMeta.tsx` being shared between the Home and History rows.
 *
 * Each screen still declares its own `useSharedValue(0)` per element rather
 * than this hook allocating them: the count varies per screen, and allocating
 * in a loop would break the rules of hooks.
 */

export const SCREEN_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
export const INTRO_MS = 340;
/** Offset between consecutive elements' entrances. */
export const STAGGER_MS = 80;

/** Fade in while rising. The default for anything with a box. */
export const useRise = (sv: SharedValue<number>) =>
  useAnimatedStyle(() => ({
    opacity: sv.value,
    transform: [{ translateY: (1 - sv.value) * 10 }],
  }));

/**
 * Fade only, no rise — for hairlines and dividers, which read as sliding rather
 * than settling if they move.
 */
export const useFade = (sv: SharedValue<number>) =>
  useAnimatedStyle(() => ({ opacity: sv.value }));

/**
 * (Re)start the entrance. Called from a focus effect so it replays each time
 * the tab is returned to; array order is the stagger order.
 */
export function playIntro(values: SharedValue<number>[]): void {
  values.forEach((sv, i) => {
    sv.value = 0;
    sv.value = withDelay(
      i * STAGGER_MS,
      withTiming(1, { duration: INTRO_MS, easing: SCREEN_EASING }),
    );
  });
}
