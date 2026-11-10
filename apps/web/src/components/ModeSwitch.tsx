"use client";

export type ScoringMode = "detailed" | "simple";

const MODES: { mode: ScoringMode; label: string; caption: string }[] = [
  {
    mode: "detailed",
    label: "Detailed",
    caption: "Conquer, Hold or Special for every point.",
  },
  {
    mode: "simple",
    label: "Simple",
    caption: "A plain counter: + and −.",
  },
];

/**
 * The Detailed / Simple switch above the hero phone, with one line beside it
 * on how the shown mode scores. The app's two scoring modes (Profile →
 * Scoring).
 */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}) {
  const current = MODES.find((m) => m.mode === mode) ?? MODES[0]!;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <div
        role="group"
        aria-label="Scoring mode"
        className="inline-flex rounded-full border border-border bg-surface p-1"
      >
        {MODES.map(({ mode: m, label }) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onChange(m)}
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
      <p
        aria-live="polite"
        // A fixed width beside the pill, so the pill doesn't shift as the
        // caption changes length.
        className="text-center font-display text-sm text-ink-secondary sm:w-68 sm:text-left"
      >
        {current.caption}
      </p>
    </div>
  );
}
