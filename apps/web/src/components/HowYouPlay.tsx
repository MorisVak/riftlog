import { Reveal } from "./Reveal";
import {
  CloudOff,
  LogIn,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/** The small facts, as one quiet strip rather than a section of cards. */
const FACTS: { icon: LucideIcon; text: string }[] = [
  { icon: UserRound, text: "Try it as a guest" },
  { icon: CloudOff, text: "Works offline" },
  { icon: LogIn, text: "Discord, Google, Apple or email. No passwords" },
  { icon: ShieldCheck, text: "Only your data. Delete it anytime" },
];

export function HowYouPlay() {
  return (
    <section id="details" className="scroll-mt-20 border-t border-border/60">
      <Reveal className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <ul className="flex flex-wrap justify-center gap-x-10 gap-y-4">
          {FACTS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2.5 font-display text-[15px] text-ink-secondary"
            >
              <Icon size={18} strokeWidth={2} className="shrink-0 text-accent-soft" />
              {text}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
