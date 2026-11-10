import { PhoneFrame } from "./PhoneFrame";
import { Reveal } from "./Reveal";
import type { ScreenshotName } from "./screenshots.generated";

export type BeatPoint = { title: string; body: string };
/** A still of the app. Beats show stills only: clips here read as noisy. */
export type BeatShot = { shot: ScreenshotName; alt: string; caption: string };

/** Every phone on the page is this wide, whatever the beat. */
const PHONE_W = "w-[250px]";

/**
 * One beat of a match on the one-pager — before, at the table, after: a
 * heading, one sentence and three short lines beside one or two phones.
 * Beats alternate sides (`flip`) so the page reads as a zig-zag. On narrow
 * screens the text comes first and two phones scroll sideways (snapping)
 * instead of shrinking past readability.
 */
export function Beat({
  id,
  eyebrow,
  title,
  intro,
  points,
  shots,
  flip = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: BeatPoint[];
  shots: BeatShot[];
  /** Phones on the left, text on the right. */
  flip?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className={flip ? "lg:order-2" : undefined}>
          <Reveal>
            <p className="font-display text-sm font-semibold uppercase tracking-widest text-accent-soft">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 font-display text-lg leading-relaxed text-ink-secondary">
              {intro}
            </p>
          </Reveal>

          <dl className="mt-10 space-y-7">
            {points.map((p, i) => (
              <Reveal
                key={p.title}
                delay={100 + i * 80}
                className="border-l-2 border-accent/40 pl-4"
              >
                <dt className="font-display text-base font-semibold text-ink-primary">
                  {p.title}
                </dt>
                <dd className="mt-1.5 font-display text-[15px] leading-relaxed text-ink-secondary">
                  {p.body}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <Reveal
          group
          className={`-mx-5 snap-x snap-mandatory overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0 ${
            flip ? "lg:order-1" : ""
          }`}
        >
          <ul className="mx-auto flex w-max gap-6">
            {shots.map(({ shot, alt, caption }, i) => (
              <li
                key={shot}
                data-reveal-child
                style={{ transitionDelay: `${i * 140}ms` }}
                className={`${PHONE_W} shrink-0 snap-center`}
              >
                <PhoneFrame shot={shot} alt={alt} />
                <p className="mt-4 text-center font-display text-sm text-ink-secondary">
                  {caption}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
