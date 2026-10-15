import { ChartLine, Layers, Swords, type LucideIcon } from "lucide-react";
import { PhoneFrame } from "./PhoneFrame";
import { WaitlistForm } from "./WaitlistForm";

const TILES: { icon: LucideIcon; title: string; body: string; href: string }[] = [
  { icon: Swords, title: "Live scoring", body: "One phone, two players", href: "#table" },
  { icon: ChartLine, title: "Match history", body: "Scores, graphs, notes", href: "#history" },
  { icon: Layers, title: "Decks", body: "Every version saved", href: "#history" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Signature periwinkle glow behind the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start">
          <h1 className="animate-rise font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-ink-primary sm:text-6xl">
            Keep score.
            <br />
            Log every match.
            <br />
            <span className="text-accent">Track your decks.</span>
          </h1>

          <p
            style={{ animationDelay: "100ms" }}
            className="animate-rise mt-6 max-w-lg font-display text-lg leading-relaxed text-ink-secondary"
          >
            Riftlog is a free, fan-made companion for in-person Riftbound games.
            Score on one phone, then look back at every match and deck.
          </p>

          <div style={{ animationDelay: "200ms" }} className="animate-rise mt-8 w-full">
            <WaitlistForm />
          </div>

          <ul
            style={{ animationDelay: "300ms" }}
            className="animate-rise mt-10 grid w-full grid-cols-1 border-t border-border/60 sm:grid-cols-3"
          >
            {TILES.map(({ icon: Icon, title, body, href }) => (
              <li
                key={title}
                className="border-b border-border/60 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:first:*:pl-0"
              >
                <a href={href} className="group flex flex-col gap-1 py-4 sm:px-4">
                  <Icon size={18} strokeWidth={2} className="text-accent-soft" />
                  <span className="mt-2 font-display text-sm font-semibold text-ink-primary group-hover:text-accent-soft">
                    {title}
                  </span>
                  <span className="font-display text-sm text-ink-secondary">{body}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{ animationDelay: "150ms" }}
          className="animate-rise flex justify-center lg:justify-end"
        >
          <PhoneFrame
            shot="board"
            alt="Riftlog score board mid-game: 5 to 4, with a running match clock and Conquer, Hold and Special buttons for each player"
            glow
            priority
            className="max-w-[300px]"
          />
        </div>
      </div>
    </section>
  );
}
