import { PhoneFrame } from "./PhoneFrame";
import { Reveal } from "./Reveal";

/**
 * The game-start face-off, wide: the versus intro the app plays before each
 * game, recorded with the phone held sideways. Too wide for a feature
 * beat's phones, so it gets its own strip between the hero and the beats.
 */
export function FaceOff() {
  return (
    <section id="face-off" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-accent-soft">
            Game start
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
            A face-off before every game
          </h2>
          <p className="mt-4 font-display text-lg leading-relaxed text-ink-secondary">
            Your legend meets theirs, and the game is on.
          </p>
        </Reveal>
        <Reveal delay={120} className="mx-auto mt-12 max-w-3xl">
          <PhoneFrame
            video="intro"
            alt="Recording of the game-start intro held sideways: Riven slides in from the left and Akali from the right, VS appears between them, with Game 2, Best of 3 and both player names, then the score board"
            glow
          />
        </Reveal>
      </div>
    </section>
  );
}
