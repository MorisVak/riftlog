import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./Reveal";

/**
 * Planned features as a roadmap — clearly labelled as not in the app yet, and
 * with no screenshots. Keep this strictly to items on the roadmap, in build
 * order, and keep stats wording personal (never cross-player data).
 *
 * `id` is a stable key per item, so a later "vote for what's next" can attach
 * to it; the card footer is where that control would go.
 */
type Phase = "next" | "planned" | "later";

const PHASE_LABEL: Record<Phase, string> = {
  next: "Up next",
  planned: "Planned",
  later: "Later",
};

const ITEMS: {
  id: string;
  phase: Phase;
  icon: LucideIcon;
  title: string;
  body: string;
  points: string[];
}[] = [
  {
    id: "matchmode",
    phase: "next",
    icon: QrCode,
    title: "Matchmode",
    body: "Scan a QR code so both players get the match.",
    points: [
      "Saved for both of you",
      "See how you've done against each player",
    ],
  },
  {
    id: "sideboard-guide",
    phase: "planned",
    icon: ArrowLeftRight,
    title: "Sideboard guide",
    body: "Plan what you side in and out for each matchup.",
    points: ["In and out, per matchup", "Check it between games in a Bo3"],
  },
  {
    id: "stats",
    phase: "later",
    icon: ChartNoAxesColumn,
    title: "Stats",
    body: "Your results, all in one place.",
    points: [
      "Across all your decks",
      "For each deck",
      "Only from your own matches",
    ],
  },
];

export function ComingLater() {
  return (
    <section
      id="coming-later"
      className="scroll-mt-20 border-t border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-accent-soft">
            Roadmap
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
              Coming later
            </h2>
            <span className="rounded-full border border-border px-3 py-1 font-display text-xs font-medium uppercase tracking-widest text-ink-secondary">
              Not in the app yet
            </span>
          </div>
          <p className="mt-4 max-w-2xl font-display text-lg text-ink-secondary">
            What I&apos;m building next, in order. Plans may change.
          </p>
        </Reveal>

        <div className="relative mt-12">
          {/* The rail: down the left on phones, across the top on desktop. */}
          <div
            aria-hidden
            className="absolute bottom-6 left-5 top-5 w-px bg-linear-to-b from-accent via-border to-transparent lg:inset-x-5 lg:bottom-auto lg:h-px lg:w-auto lg:bg-linear-to-r"
          />
          <ol className="relative grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
            {ITEMS.map(({ id, phase, icon: Icon, title, body, points }, i) => {
              const next = phase === "next";
              return (
                <Reveal
                  as="li"
                  key={id}
                  delay={i * 120}
                  className="relative pl-14 lg:pl-0 lg:pt-16"
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-medium ring-4 ring-background ${
                      next
                        ? "bg-accent text-accent-deep shadow-accent-btn"
                        : "border border-border bg-surface text-ink-secondary"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <article
                    className={`flex h-full flex-col rounded-2xl border bg-surface p-6 ${
                      next ? "border-accent/50" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
                        <Icon
                          size={20}
                          strokeWidth={2}
                          className="text-accent-soft"
                        />
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 font-display text-xs font-medium uppercase tracking-widest ${
                          next
                            ? "bg-accent/15 text-accent-soft"
                            : "border border-border text-ink-secondary"
                        }`}
                      >
                        {PHASE_LABEL[phase]}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-ink-primary">
                      {title}
                    </h3>
                    <p className="mt-2 font-display text-[15px] leading-relaxed text-ink-secondary">
                      {body}
                    </p>
                    <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
                      {points.map((point) => (
                        <li
                          key={point}
                          className="flex gap-3 font-display text-[15px] leading-snug text-ink-secondary"
                        >
                          <span
                            aria-hidden
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
