import { Reveal } from "./Reveal";
import {
  CloudOff,
  LogIn,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const CARDS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: UserRound,
    title: "Try it as a guest",
    body: "Play a full match without an account. Guest matches aren't saved.",
  },
  {
    icon: CloudOff,
    title: "Works offline",
    body: "Matches finished offline upload once you're back online.",
  },
  {
    icon: LogIn,
    title: "Easy sign-in",
    body: "Discord, Google, Apple or an email code. No passwords.",
  },
  {
    icon: ShieldCheck,
    title: "Only your data",
    body: "You only see your own matches. No stats across other players.",
  },
];

export function HowYouPlay() {
  return (
    <section id="details" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            The details
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map(({ icon: Icon, title, body }, i) => (
            <Reveal
              key={title}
              delay={i * 100}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
                <Icon size={20} strokeWidth={2} className="text-accent-soft" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-primary">
                {title}
              </h3>
              <p className="mt-2 font-display text-[15px] leading-relaxed text-ink-secondary">
                {body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
