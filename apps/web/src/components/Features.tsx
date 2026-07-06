import {
  Gauge,
  History,
  Layers,
  BarChart3,
  Cloud,
  GitCompare,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: Gauge,
    title: "Live score tracking",
    body: "A fast two-player tally for in-person games. Bo1 or Bo3, counted up to the target score — nothing ends until you say so, so a stray tap never closes a game.",
  },
  {
    icon: History,
    title: "Match history",
    body: "Every completed match, newest first: result, format, final game score, and the deck you played — with a per-game breakdown when you want the detail.",
  },
  {
    icon: Layers,
    title: "Deck import & snapshots",
    body: "Import your lists from Piltover Archive or Riftmana. Each match captures an immutable snapshot, so history always shows the exact deck you played.",
  },
  {
    icon: BarChart3,
    title: "Your stats",
    body: "See your own win/loss ratio, per-deck performance, and matchup spread. Personal insight into your play — never cross-player metagame data.",
  },
  {
    icon: Cloud,
    title: "Cloud sync",
    body: "Matches sync across your devices and survive a reinstall. Play offline and it queues locally, then uploads automatically when you reconnect.",
  },
  {
    icon: GitCompare,
    title: "Deck versioning",
    body: "Tweak a deck between matches and Riftlog tracks what changed — cards added, removed, or re-quantified — so you can see how the list evolved.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            Everything you need to track your play
          </h2>
          <p className="mt-4 font-display text-lg text-ink-secondary">
            From the first point of a game to a season of match history — Riftlog
            keeps score, remembers your decks, and shows you how you&apos;re doing.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15">
                <Icon size={22} strokeWidth={2} className="text-accent-soft" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-primary">
                {title}
              </h3>
              <p className="mt-2 font-display text-[15px] leading-relaxed text-ink-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
