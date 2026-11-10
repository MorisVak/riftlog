"use client";

export type ScoringMode = "detailed" | "simple";

const MODES: { mode: ScoringMode; label: string }[] = [
  { mode: "detailed", label: "Detailed" },
  { mode: "simple", label: "Simple" },
];

/**
 * The Detailed / Simple switch centred above the hero phone: the app's two
 * scoring modes (Profile → Scoring). No caption — the board under it shows
 * the difference.
 */
export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}) {
  return (
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
  );
}
