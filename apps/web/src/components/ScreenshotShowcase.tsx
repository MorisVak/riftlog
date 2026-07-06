import { PhoneMock } from "./PhoneMock";

const SHOTS = [
  { label: "Score board", caption: "Tap to tally — Bo1 or Bo3, up to the target score." },
  { label: "Match history", caption: "Every game, with decks, formats, and results." },
  { label: "Deck stats", caption: "Win rate and matchup spread, per deck." },
];

export function ScreenshotShowcase() {
  return (
    <section id="preview" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-4 font-display text-lg text-ink-secondary">
            A first look at the app. Real screenshots are on the way.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 justify-items-center gap-12 sm:grid-cols-3 sm:gap-6">
          {SHOTS.map((shot, i) => (
            <div key={shot.label} className="flex flex-col items-center">
              <PhoneMock label={shot.label} glow={i === 1} />
              <p className="mt-5 max-w-[220px] text-center font-display text-sm text-ink-secondary">
                {shot.caption}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
