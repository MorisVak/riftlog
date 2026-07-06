import { PhoneMock } from "./PhoneMock";
import { WaitlistForm } from "./WaitlistForm";

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

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:py-28">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 font-display text-xs font-medium uppercase tracking-widest text-accent-soft">
            The companion app for Riftbound TCG
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-primary sm:text-5xl lg:text-6xl">
            Your Riftbound
            <br />
            match companion.
          </h1>

          <p className="mt-6 max-w-xl font-display text-lg leading-relaxed text-ink-secondary">
            Live score tracking and a durable, browsable history of every game
            you play — with decks, formats, and scores recorded alongside each
            match.
          </p>

          <div id="waitlist-hero" className="mt-9 w-full">
            <WaitlistForm />
            <p className="mt-3 font-display text-sm text-ink-tertiary">
              Join the waitlist for early access. No spam — just launch news.
            </p>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PhoneMock label="Score board" glow />
        </div>
      </div>
    </section>
  );
}
