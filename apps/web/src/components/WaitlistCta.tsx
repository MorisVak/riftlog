import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

export function WaitlistCta() {
  return (
    <section id="waitlist" className="scroll-mt-20 border-t border-border/60 bg-surface/40">
      <Reveal className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-primary">
            Be first on the Rift.
          </h2>
          <p className="mt-2 font-display text-lg text-ink-secondary">
            Get one email when Riftlog launches.
          </p>
        </div>
        <WaitlistForm />
      </Reveal>
    </section>
  );
}
