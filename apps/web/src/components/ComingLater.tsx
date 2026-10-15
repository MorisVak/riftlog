import { Reveal } from "./Reveal";

/**
 * Planned features in one slim, clearly labelled line. Keep it to roadmap
 * items the spec commits to, and keep stats wording personal (never
 * cross-player data).
 */
const ITEMS = ["Deck stats", "Deck codes", "Card art", "Shared matches by QR"];

export function ComingLater() {
  return (
    <section id="coming-later" className="scroll-mt-20 border-t border-border/60">
      <Reveal className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:gap-6 sm:px-8">
        <span className="w-fit shrink-0 rounded-full border border-border px-3 py-1 font-display text-xs font-medium uppercase tracking-widest text-ink-secondary">
          Coming later
        </span>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-display text-base text-ink-secondary">
          {ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
