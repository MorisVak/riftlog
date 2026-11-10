import { Platform, type ViewStyle } from 'react-native';

const ANDROID = Platform.OS === 'android';

/** "#8B93D9", 0.28 → "rgba(139, 147, 217, 0.28)". */
const rgba = (hex: string, alpha: number): string => {
  'worklet';
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/**
 * A soft colored glow (or lift) under a view, drawn on both platforms.
 *
 * iOS keeps its native shadow, unchanged. Android doesn't draw iOS shadow
 * props at all (`shadowColor` / `shadowOpacity` …), so every accent glow was
 * flat there; it gets the same glow as a `boxShadow` (RN 0.81, New
 * Architecture), whose blur is about twice iOS's `shadowRadius` for the
 * same look. A boxShadow follows the view's rounded rectangle, so use this
 * for boxes and pills, not shapes drawn from several views (the board
 * divider's hexagons keep their iOS-only shadow).
 *
 * A worklet, so animated glows can call it from `useAnimatedStyle`.
 * `color` is a token's hex, mirrored (style objects can't take classes).
 */
export function glow(color: string, opacity: number, radius: number, offsetY = 0): ViewStyle {
  'worklet';
  if (ANDROID) {
    return { boxShadow: `0px ${offsetY}px ${radius * 2}px ${rgba(color, opacity)}` };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}
