import { PhoneFrame } from "./PhoneFrame";
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

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:py-24">
        <div className="flex flex-col items-start">
          <span className="animate-rise inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 font-display text-xs font-medium uppercase tracking-widest text-accent-soft">
            A free, fan-made companion for Riftbound
          </span>

          <h1
            style={{ animationDelay: "80ms" }}
            className="animate-rise mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-primary sm:text-5xl lg:text-6xl"
          >
            Your Riftbound
            <br />
            match companion.
          </h1>

          <p
            style={{ animationDelay: "160ms" }}
            className="animate-rise mt-6 max-w-xl font-display text-lg leading-relaxed text-ink-secondary"
          >
            <strong className="font-semibold text-ink-primary">
              Keep score
            </strong>{" "}
            during your in-person games.{" "}
            <strong className="font-semibold text-ink-primary">
              Keep every match
            </strong>{" "}
            in your history, along with the deck you played.
          </p>

          <div
            id="waitlist-hero"
            style={{ animationDelay: "240ms" }}
            className="animate-rise mt-9 w-full"
          >
            <WaitlistForm />
          </div>
        </div>

        <div
          style={{ animationDelay: "200ms" }}
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
