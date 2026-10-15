import { CloudOff, LogIn, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";

const CARDS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: UserRound,
    title: "Try it as a guest",
    body: "Run a full match without an account. Nothing is saved until you sign in.",
  },
  {
    icon: CloudOff,
    title: "Ready for bad signal",
    body: "Finish a match offline and it uploads on its own when you're back online.",
  },
  {
    icon: LogIn,
    title: "Sign in your way",
    body: "Discord, Google, Apple or a one-time email code. No passwords, and you pick your own @handle.",
  },
  {
    icon: ShieldCheck,
    title: "Your data, your stats",
    body: "You only ever see your own matches. Riftlog shows no cross-player data: no win rates by deck, no matchup tables.",
  },
];

export function HowYouPlay() {
  return (
    <section id="details" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
          Works the way you play
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
                <Icon size={20} strokeWidth={2} className="text-accent-soft" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-primary">{title}</h3>
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
