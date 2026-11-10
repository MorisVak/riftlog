import { glow } from '@/lib/glow';

/**
 * The accent glow under a primary CTA, as a style object rather than the
 * `shadow-accent-btn` class. Toggling that class at render time (a button that
 * enables once its form is valid) throws "Couldn't find a navigation context"
 * — the NativeWind + expo-router issue documented in apps/mobile/CLAUDE.md
 * (expo/expo#38423). Always-on CTAs can keep the class. Values mirror the
 * `accent-btn` boxShadow token in tailwind.config.js. Drawn on Android too
 * (`glow`, lib/glow.ts) — the class and iOS shadow props aren't.
 */
export const CTA_GLOW = glow('#8B93D9', 0.28, 10, 3); // accent
