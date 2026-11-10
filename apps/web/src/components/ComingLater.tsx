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
 * Planned features as a short roadmap — clearly labelled as not in the app
 * yet, and with no screenshots. Keep this strictly to items on the roadmap,
 * in build order, and keep stats wording personal (never cross-player data).
 * Only the next few are shown as cards; the rest are named in one line, so
 * the section stays quiet next to the features above it.
 *
 * `id` is a stable key per item, so a later "vote for what's next" can attach
 * to it. `points` aren't shown today; they're kept for that page.
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
    body: "The board already shows both legends. Next: make your half your own.",
    points: [
      "Any legend you like behind your score",
      "Custom backgrounds",
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

/** How many items get a card; the rest are named in one line. */
const SHOWN = 3;

export function ComingLater() {
  const shown = ITEMS.slice(0, SHOWN);
  const later = ITEMS.slice(SHOWN).map((item) => item.title);

  return (
    <section id="coming-later" className="scroll-mt-20 border-t border-border/60">
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

        <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {shown.map(({ id, phase, icon: Icon, title, body }, i) => (
            <Reveal
              as="li"
              key={id}
              delay={i * 100}
              className={`rounded-2xl border bg-surface p-6 ${
                phase === "next" ? "border-accent/50" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                  <Icon size={19} strokeWidth={2} className="text-accent-soft" />
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-display text-xs font-medium uppercase tracking-widest ${
                    phase === "next"
                      ? "bg-accent/15 text-accent-soft"
                      : "border border-border text-ink-secondary"
                  }`}
                >
                  {PHASE_LABEL[phase]}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-primary">
                {title}
              </h3>
              <p className="mt-1.5 font-display text-[15px] leading-relaxed text-ink-secondary">
                {body}
              </p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={SHOWN * 100}>
          <p className="mt-8 font-display text-[15px] leading-relaxed text-ink-secondary">
            {later.length > 0 && <>Later: {later.join(", ")}. </>}
            Have an idea?{" "}
            <Link
              href="/contact"
              className="text-accent-soft underline underline-offset-4 hover:text-ink-primary"
            >
              Suggest a feature
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
