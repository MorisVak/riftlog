import { HeroPhone } from "./HeroPhone";
import { WaitlistForm } from "./WaitlistForm";
import { Platforms } from "./Platforms";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Signature periwinkle glow blob behind the hero content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />
      {/* Faint decorative rings (adapting the mobile Start-card rings). */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-8rem] top-24 h-[360px] w-[360px] rounded-full border border-accent/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-2rem] top-48 h-[220px] w-[220px] rounded-full border border-accent/10"
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start">
          <span className="animate-rise inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 font-display text-xs font-medium uppercase tracking-widest text-accent-soft">
            A free, fan-made companion for Riftbound
          </span>

          <h1
            style={{ animationDelay: "80ms" }}
            className="animate-rise mt-6 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight text-ink-primary sm:text-6xl"
          >
            Keep score.
            <br />
            Log every match.
            <br />
            <span className="text-accent">Track your decks.</span>
          </h1>

          <p
            style={{ animationDelay: "160ms" }}
            className="animate-rise mt-6 max-w-xl font-display text-lg leading-relaxed text-ink-secondary"
          >
            Score your in-person Riftbound games on one phone, then look back at
            every match and every deck you played.
          </p>

          <div
            id="waitlist-hero"
            style={{ animationDelay: "240ms" }}
            className="animate-rise mt-9 w-full"
          >
            <WaitlistForm />
          </div>

          <div
            style={{ animationDelay: "320ms" }}
            className="animate-rise mt-7"
          >
            <Platforms />
          </div>
        </div>

        <div
          style={{ animationDelay: "200ms" }}
          className="animate-rise flex justify-center lg:justify-end"
        >
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}
