import { Easing, FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';

/**
 * The match flow's small transitions, as Reanimated layout animations — put
 * them on an `Animated.View`'s `entering` / `exiting`. Shared so the end-game
 * prompt, the between-games screen and the match-complete screen move alike.
 * Reanimated honors the system's Reduce Motion setting for these.
 */

const OUT = Easing.out(Easing.cubic);

/** A dimming backdrop behind a popup. */
export const BACKDROP_ENTER = FadeIn.duration(160);
export const BACKDROP_EXIT = FadeOut.duration(120);

/** A popup card: fades in while settling from slightly small and low. */
export const POPUP_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }, { translateY: 10 }] },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }, { translateY: 0 }],
    easing: OUT,
  },
}).duration(220);

export const POPUP_EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.96 }], easing: Easing.in(Easing.cubic) },
}).duration(120);

/** A whole screen of the match flow (between games, match complete). */
export const SCREEN_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 16 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: OUT },
}).duration(320);

/**
 * A result badge popping in after its screen: grows past full size and
 * settles. `delay` so it lands once the screen is mostly in.
 */
export const badgePop = (delay = 140) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.5 }] },
    65: { opacity: 1, transform: [{ scale: 1.08 }], easing: OUT },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.inOut(Easing.quad) },
  })
    .duration(380)
    .delay(delay);

/** One item of a list rising into place, `index` steps after the first. */
export const riseIn = (index: number, base = 160, step = 70) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 12 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: OUT },
  })
    .duration(300)
    .delay(base + index * step);
