import { WaitlistForm } from "./WaitlistForm";

export function WaitlistCta() {
  return (
    <section id="waitlist" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-14 shadow-accent-card sm:px-12">
          {/* Periwinkle glow wash inside the band. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-full h-[320px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[110px]"
          />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
              Be first on the Rift.
            </h2>
            <p className="mt-4 font-display text-lg text-ink-secondary">
              Riftlog is in active development. Join the waitlist and we&apos;ll
              let you know the moment early access opens.
            </p>
            <WaitlistForm className="mt-8 justify-center" />
          </div>
        </div>
      </div>
    </section>
  );
}
