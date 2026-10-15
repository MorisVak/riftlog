import { Reveal } from "./Reveal";

/**
 * Planned features — clearly labelled as not in the app yet, muted, and with
 * no screenshots. Keep this strictly to roadmap items the spec commits to,
 * and keep stats wording personal (never cross-player data).
 */
const ITEMS: { title: string; body: string }[] = [
  {
    title: "Deck stats",
    body: "Results for each of your decks, from your own matches.",
  },
  {
    title: "Deck codes",
    body: "Import a deck with a Piltover Archive deck code.",
  },
  {
    title: "Card art",
    body: "Card images in your decklists, once Riot approves our API key.",
  },
  {
    title: "Shared matches",
    body: "Scan a QR code so both players get the match, plus your head-to-head record.",
  },
  {
    title: "Change your @handle",
    body: "Rename yourself from your profile.",
  },
];

export function ComingLater() {
  return (
    <section
      id="coming-later"
      className="scroll-mt-20 border-t border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
              Coming later
            </h2>
            <span className="rounded-full border border-border px-3 py-1 font-display text-xs font-medium uppercase tracking-widest text-ink-secondary">
              Not in the app yet
            </span>
          </div>
          <p className="mt-4 max-w-2xl font-display text-lg text-ink-secondary">
            On our roadmap. Plans may change.
          </p>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ title, body }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 80}
              className="rounded-2xl border border-dashed border-border p-5"
            >
              <h3 className="font-display text-base font-semibold text-ink-primary">
                {title}
              </h3>
              <p className="mt-1.5 font-display text-[15px] leading-relaxed text-ink-secondary">
                {body}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
