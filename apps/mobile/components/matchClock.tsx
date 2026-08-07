import React, { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useMatch } from '@/contexts/matchContext';
import { formatClock, remainingSeconds } from '@/lib/clock';

/**
 * The live match clock for timed games — one countdown for the whole match,
 * running through the between-games break and on past zero into overtime.
 * Renders nothing when the match is untimed, so callers can drop it in
 * unconditionally.
 *
 * The remaining time is derived from wall-clock on every tick (see `lib/clock`),
 * so this component holds no countdown state that could drift or need
 * restoring — it only re-renders on a timer.
 */

type Variant = 'board' | 'screen';

// `board` sits in the narrow left slot of the play field's center bar (rotated
// by the caller); `screen` is the large readable clock on the between-games
// interstitial.
const VARIANT: Record<Variant, { time: string; label: string }> = {
  board: { time: 'text-lg', label: 'text-[9px]' },
  screen: { time: 'text-4xl', label: 'text-xs' },
};

// Sampled twice a second so the displayed second flips promptly — polling at
// exactly 1s drifts against the wall clock and can look like it skipped.
const TICK_MS = 500;

/** `Date.now()` on a tick, plus an immediate re-read when the app foregrounds. */
const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    // JS timers are throttled in the background; the elapsed time is still
    // correct on return (it's wall-clock derived), this just repaints at once
    // instead of waiting for the next tick.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active]);

  return now;
};

type Props = {
  variant?: Variant;
  /** Rotation / spacing from the caller, e.g. `-rotate-90` on the board. */
  className?: string;
};

const MatchClock = ({ variant = 'board', className = '' }: Props) => {
  const { match } = useMatch();
  const now = useNow(match?.timeLimitSeconds != null);

  const remaining = match ? remainingSeconds(match, now) : null;
  if (remaining === null) return null;

  const overtime = remaining < 0;
  const v = VARIANT[variant];

  return (
    <View className={`items-center ${className}`}>
      <Text
        className={`font-mono ${v.time} ${
          overtime ? 'text-loss-text' : 'text-ink-primary'
        }`}
        // Both players read this clock; never let it truncate.
        numberOfLines={1}
      >
        {formatClock(remaining)}
      </Text>

      {/* Overtime carries a label as well as a color — the same rule the result
          badges follow, so color is never the only signal. */}
      {overtime && (
        <Text
          className={`font-display-bold ${v.label} tracking-widest text-loss-text`}
        >
          OT
        </Text>
      )}
    </View>
  );
};

export default MatchClock;
