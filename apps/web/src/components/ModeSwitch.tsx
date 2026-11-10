"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type ScoringMode = "detailed" | "simple";

const MODES: { mode: ScoringMode; label: string }[] = [
  { mode: "detailed", label: "Detailed" },
  { mode: "simple", label: "Simple" },
];

/**
 * The Detailed / Simple switch centred above the hero phone: the app's two
 * scoring modes (Profile → Scoring). No caption — the board under it shows
 * the difference.
 *
 * Moves like the app's tab bar (apps/mobile/components/tabBar.tsx): the
 * highlight glides to the chosen side on a springy curve, and the chosen
 * label pops (`.animate-tap`). `shown` makes the whole switch pop in
 * (`.animate-pop`) once the hero phone is in place.
 */
export function ModeSwitch({
  mode,
  onChange,
  shown,
}: {
  mode: ScoringMode;
  onChange: (mode: ScoringMode) => void;
  shown: boolean;
}) {
  const refs = useRef<Partial<Record<ScoringMode, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  // Bumped on each change, so the chosen label's pop replays every time.
  const [taps, setTaps] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[mode];
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    Object.values(refs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [mode]);

  const choose = (m: ScoringMode) => {
    if (m === mode) return;
    setTaps((n) => n + 1);
    onChange(m);
  };

  return (
    <div
      role="group"
      aria-label="Scoring mode"
      className={`relative inline-flex rounded-full border border-border bg-surface p-1 ${
        shown ? "animate-pop" : "opacity-0"
      }`}
    >
      {/* The gliding highlight (after the first measure, so it never jumps
          in from the left edge). */}
      {pill && (
        <span
          aria-hidden
          style={{ width: pill.w, transform: `translateX(${pill.x - 4}px)` }}
          className="absolute bottom-1 left-1 top-1 rounded-full bg-accent shadow-accent-btn transition-[transform,width] duration-[420ms] ease-[cubic-bezier(0.34,1.45,0.64,1)] motion-reduce:transition-none"
        />
      )}
      {MODES.map(({ mode: m, label }) => {
        const on = mode === m;
        return (
          <button
            key={m}
            ref={(el) => {
              refs.current[m] = el;
            }}
            type="button"
            aria-pressed={on}
            onClick={() => choose(m)}
            className={`relative rounded-full px-5 py-2 font-display text-sm font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              on ? "text-accent-deep" : "text-ink-secondary hover:text-ink-primary"
            } ${!pill && on ? "bg-accent" : ""}`}
          >
            <span
              key={on ? `on-${taps}` : "off"}
              className={`inline-block ${on && taps > 0 ? "animate-tap" : ""}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
