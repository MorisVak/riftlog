import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * Takes over Android's back button while the screen is mounted: `onBack`
 * runs instead of the default, which on the match screens left the app —
 * the match lives inside the Home tab, and back on Home closes the app.
 * Always consumes the press. A no-op on iOS (no back button).
 *
 * The latest `onBack` is used without re-registering on every render.
 */
export function useAndroidBack(onBack: () => void, enabled = true) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handler.current();
      return true;
    });
    return () => sub.remove();
  }, [enabled]);
}
