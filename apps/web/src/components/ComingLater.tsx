import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  NotebookPen,
  Palette,
  QrCode,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
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
    id: "quick-log",
    phase: "planned",
    icon: NotebookPen,
    title: "Quick log",
    body: "Note down a match without scoring it live.",
    points: [
      "Just enter who won and the final score",
      "Add your deck and a few notes",
      "Saved to your history like any other match",
    ],
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
  {
    id: "playerboard",
    phase: "later",
    icon: Palette,
    title: "Playerboard customization",
    body: "Change the background of your board.",
    points: [
      "Show the legend you're playing",
      "Or any legend you like",
      "Maybe some custom backgrounds too",
    ],
  },
  {
    id: "teams-friends",
    phase: "later",
    icon: Users,
    title: "Teams and friends",
    body: "Add your friends and play together.",
    points: [
      "Invite a friend to a match",
      "Share decks with each other",
      "Start a team to share decks as a group",
    ],
  },
];

/** Cards per row on desktop. */
const PER_ROW = 3;

/** The blurred "More to come" card after the last item, so the rail runs into it. */
const MORE_INDEX = ITEMS.length;

export function ComingLater() {
  return (
    <section
      id="coming-later"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/60"
    >
      {/* A faint map grid with a soft glow, fading out towards the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[28px_28px] opacity-70 mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
      />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
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
          {/* The rail down the left on phones. On desktop each card draws
              its own piece: across to the next card, and at the end of a row
              down the right side and back through the gap to the next row. */}
          <div
            aria-hidden
            className="absolute bottom-6 left-5 top-5 w-px bg-linear-to-b from-accent via-border to-transparent lg:hidden"
          />
          <ol className="relative grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
            {ITEMS.map(({ id, phase, icon: Icon, title, body, points }, i) => {
              const next = phase === "next";
              const rowEnd = (i + 1) % PER_ROW === 0;
              const rowStart = i > 0 && i % PER_ROW === 0;
              return (
                <Reveal
                  as="li"
                  key={id}
                  delay={i * 120}
                  className="relative pl-14 lg:pl-0 lg:pt-16"
                >
                  {!rowEnd && (
                    <span
                      aria-hidden
                      className={`absolute left-10 top-5 hidden h-px w-[calc(100%-1rem)] lg:block ${
                        next
                          ? "bg-linear-to-r from-accent to-border"
                          : "bg-border"
                      }`}
                    />
                  )}
                  {rowEnd && (
                    <span
                      aria-hidden
                      className="absolute -bottom-[calc(1.25rem+1px)] -right-4 left-10 top-5 hidden rounded-r-2xl border-y border-r border-border lg:block"
                    />
                  )}
                  {rowStart && <RowStartRail />}
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
            <Reveal
              as="li"
              delay={MORE_INDEX * 120}
              className="relative pl-14 lg:pl-0 lg:pt-16"
            >
              {MORE_INDEX % PER_ROW === 0 && <RowStartRail />}
              <span
                aria-hidden
                className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border bg-background font-mono text-sm font-medium text-ink-secondary ring-4 ring-background"
              >
                …
              </span>
              <article className="relative flex h-full min-h-48 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-surface/50">
                {/* Placeholder card content, blurred: there's more to come. */}
                <div
                  aria-hidden
                  className="absolute inset-0 p-6 opacity-60 blur-[3px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-11 w-11 rounded-xl bg-accent/15" />
                    <span className="h-6 w-16 rounded-full border border-border" />
                  </div>
                  <span className="mt-5 block h-4 w-2/3 rounded bg-ink-tertiary/50" />
                  <span className="mt-3 block h-3 w-5/6 rounded bg-ink-tertiary/30" />
                  <span className="mt-6 block h-3 w-3/4 rounded bg-ink-tertiary/30" />
                  <span className="mt-3 block h-3 w-1/2 rounded bg-ink-tertiary/30" />
                </div>
                <div className="relative px-6 text-center">
                  <h3 className="font-display text-2xl font-semibold text-ink-primary">
                    More to come
                  </h3>
                  <p className="mt-2 font-display text-[15px] leading-relaxed text-ink-secondary">
                    Have an idea?{" "}
                    <Link
                      href="/contact"
                      className="text-accent-soft underline underline-offset-4 hover:text-ink-primary"
                    >
                      Suggest a feature
                    </Link>
                    .
                  </p>
                </div>
              </article>
            </Reveal>
          </ol>
        </div>
      </div>
    </section>
  );
}

/** The rail coming into the first card of a row, from the previous row's end. */
function RowStartRail() {
  return (
    <span
      aria-hidden
      className="absolute -top-5 left-5 hidden h-5 w-[calc(200%+4.25rem)] rounded-tl-xl border-l border-t border-border lg:block"
    />
  );
}
