import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { MatchPhase } from '@/contexts/matchContext';

const KEEP_AWAKE_TAG = 'riftlog-match';

/**
 * Device behavior while a match is on the table.
 *
 * - The screen stays on during a game and the between-games break, whatever
 *   the phone's auto-lock setting — nobody should have to wake the board to
 *   score.
 * - Only the match screens rotate — the score board and the between-games
 *   break. The app is portrait everywhere else (`initialOrientation` in
 *   app.json locks it from launch); the match unlocks so the phone can lie
 *   sideways between the players, and the lock comes back once it's over.
 */
export function useInGameScreen(phase: MatchPhase) {
  const inGame = phase === 'playing' || phase === 'between-games';

  useEffect(() => {
    if (!inGame) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [inGame]);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      inGame
        ? ScreenOrientation.OrientationLock.DEFAULT
        : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  }, [inGame]);
}
