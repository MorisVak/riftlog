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

// `board` sits in the play field's center band, rotated a quarter turn by the
// caller — the band is sized around this text, so growing one means growing the
// other (see BAND_H in playField). `screen` is the between-games interstitial.
const VARIANT: Record<Variant, { time: string; label: string }> = {
  board: { time: 'text-4xl', label: 'text-xs' },
  screen: { time: 'text-4xl', label: 'text-xs' },
};

// Sampled twice a second so the displayed second flips promptly — polling at
// exactly 1s drifts against the wall clock and can look like it skipped.
const TICK_MS = 500;

/**
 * Re-renders on a tick while `active`, plus immediately when the app
 * foregrounds. Only a TRIGGER — callers must read `Date.now()` at render time
 * rather than use a stored timestamp.
 *
 * That distinction is the fix for a real bug: this hook used to return the
 * timestamp of the last tick, and ticking stops while the clock is paused. On
 * resume, the pause was banked into `clockPausedMs` at once but the clock was
 * still drawn with the pre-pause timestamp, so the countdown jumped UP by the
 * length of the pause until the next tick corrected it.
 */
const useTick = (active: boolean): void => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const bump = () => setTick((t) => t + 1);
    const id = setInterval(bump, TICK_MS);
    // JS timers are throttled in the background; the elapsed time is still
    // correct on return (it's wall-clock derived), this just repaints at once
    // instead of waiting for the next tick.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') bump();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active]);
};

type Props = {
  variant?: Variant;
  /**
   * Spacing / placement from the caller. Note that *rotation* belongs on a
   * wrapper with an explicit width, not here: a transform doesn't change how
   * the text is laid out, so a rotated clock in a narrow slot truncates.
   */
  className?: string;
};

const MatchClock = ({ variant = 'board', className = '' }: Props) => {
  // Opt out of the React Compiler (app.json `experiments.reactCompiler`). This
  // component reads the wall clock during render; the compiler assumes renders
  // are pure and would cache `remainingSeconds(match, Date.now())` on `match`
  // alone — freezing the countdown, since ticks don't change `match`.
  'use no memo';
  const { match } = useMatch();
  const paused = match?.clockPausedAt != null;
  // Nothing to repaint while paused — the value is frozen by definition.
  useTick(match?.timeLimitSeconds != null && !paused);

  // Always the real current time. While paused, `remainingSeconds` cancels
  // `now` out (it subtracts the open pause up to `now`), so this stays steady;
  // the render right after a resume sees the banked pause AND a fresh `now`.
  const remaining = match ? remainingSeconds(match, Date.now()) : null;
  if (remaining === null) return null;

  const overtime = remaining < 0;
  const v = VARIANT[variant];
  // A paused clock lights up in the accent — the same color as the glow and the
  // control that paused it — rather than dimming out. No label: it would grow
  // the rotated capsule the clock sits in.
  const label = overtime && !paused ? 'OT' : null;

  return (
    <View className={`items-center ${className}`}>
      <Text
        className={`font-mono ${v.time} ${
          paused ? 'text-accent' : overtime ? 'text-loss-text' : 'text-ink-primary'
        }`}
        // The clock must never be unreadable. If the box it's given is too
        // narrow for the current value — overtime adds a "+" and a digit — it
        // scales the text down rather than ellipsizing it away.
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatClock(remaining)}
      </Text>

      {/* Overtime carries a label as well as a color — the same rule the result
          badges follow, so color is never the only signal. */}
      {label && (
        <Text
          className={`font-display-bold ${v.label} tracking-widest text-loss-text`}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

export default MatchClock;
