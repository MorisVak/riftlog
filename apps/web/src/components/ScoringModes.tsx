"use client";

import { useState } from "react";
import { PhoneFrame } from "./PhoneFrame";
import type { ScreenshotName } from "./screenshots.generated";

type Mode = "detailed" | "simple";

const MODES: {
  mode: Mode;
  label: string;
  shot: ScreenshotName;
  alt: string;
  caption: string;
}[] = [
  {
    mode: "detailed",
    label: "Detailed",
    shot: "board",
    alt: "The detailed score board mid-game: 5 to 3, Riven behind your half and Akali behind theirs, with Conquer, Hold and Special under each score",
    caption: "Tap Conquer, Hold or Special. Tap the score to take a point back.",
  },
  {
    mode: "simple",
    label: "Simple",
    shot: "board-simple",
    alt: "The simple score board mid-game: 5 to 3, Riven behind your half and Akali behind theirs, with a minus and a plus beside each score",
    caption: "Tap + on your half to add a point, − to take one back.",
  },
];

/**
 * The score board in both scoring modes, with a switch between them — the
 * "At the table" beat's phone. Both shots stay mounted and crossfade, so
 * switching never waits for an image. Same phone width as every beat
 * (`phoneClass`); the caption under it says how the shown mode scores.
 */
export function ScoringModes({ phoneClass }: { phoneClass: string }) {
  const [mode, setMode] = useState<Mode>("detailed");
  const current = MODES.find((m) => m.mode === mode) ?? MODES[0]!;

  return (
    <div className="flex flex-col items-center">
      <div
        role="group"
        aria-label="Scoring mode"
        className="mb-6 inline-flex rounded-full border border-border bg-surface p-1"
      >
        {MODES.map(({ mode: m, label }) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full px-5 py-2 font-display text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              mode === m
                ? "bg-accent text-accent-deep shadow-accent-btn"
                : "text-ink-secondary hover:text-ink-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Both frames in one grid cell: the hidden one keeps its size and
          its image loaded, so the crossfade never jumps. */}
      <div className={`grid ${phoneClass}`}>
        {MODES.map(({ mode: m, shot, alt }) => (
          <div
            key={m}
            aria-hidden={mode !== m}
            className={`col-start-1 row-start-1 transition-opacity duration-300 motion-reduce:transition-none ${
              mode === m ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <PhoneFrame shot={shot} alt={alt} />
          </div>
        ))}
      </div>

      <p
        aria-live="polite"
        className="mt-4 max-w-[300px] text-center font-display text-sm text-ink-secondary"
      >
        {current.caption}
      </p>
    </div>
  );
}
