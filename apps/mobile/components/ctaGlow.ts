/**
 * The accent glow under a primary CTA, as a style object rather than the
 * `shadow-accent-btn` class. Toggling that class at render time (a button that
 * enables once its form is valid) throws "Couldn't find a navigation context"
 * — the NativeWind + expo-router issue documented in apps/mobile/CLAUDE.md
 * (expo/expo#38423). Always-on CTAs can keep the class. Values mirror the
 * `accent-btn` boxShadow token in tailwind.config.js.
 */
export const CTA_GLOW = {
  shadowColor: '#8B93D9', // accent
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.28,
  shadowRadius: 10,
} as const;
