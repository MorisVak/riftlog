import { Backdrop, type Texture } from "./Backdrop";
import { PhoneFrame } from "./PhoneFrame";
import { Reveal } from "./Reveal";
import type { ScreenshotName } from "./screenshots.generated";

export type BeatPoint = { title: string; body: string };
/** A still of the app. Beats show stills only: clips here read as noisy. */
export type BeatShot = { shot: ScreenshotName; alt: string; caption: string };

/**
 * Every phone in the beats is this wide, whatever the beat: 250px, or on a
 * narrow screen half the content width (minus the gap), so two phones always
 * fit side by side. Never cut a phone off at the edge, never size by count.
 */
const PHONE_W =
  "w-[min(250px,calc((100vw-3.5rem)/2))] sm:w-[min(250px,calc((100vw-5.5rem)/2))]";

/**
 * One beat of a match on the one-pager — before, at the table, after: a
 * heading, one sentence and three short lines beside one or two phones.
 * Beats alternate sides (`flip`) so the page reads as a zig-zag; the phone
 * side gets the wider column so two phones fit whole. On narrow screens the
 * text comes first, with the phones below it.
 */
export function Beat({
  id,
  eyebrow,
  title,
  intro,
  points,
  shots,
  flip = false,
  texture = "dots",
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: BeatPoint[];
  shots: BeatShot[];
  /** Phones on the left, text on the right. */
  flip?: boolean;
  /** The background texture (see Backdrop). */
  texture?: Texture;
}) {
  return (
    <section
      id={id}
      className="relative scroll-mt-20 overflow-hidden border-t border-border/60"
    >
      {/* The grid behind the phones, so it alternates with them. */}
      <Backdrop at={flip ? "left" : "right"} texture={texture} />
      <div
        className={`relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:gap-16 lg:py-28 ${
          flip ? "lg:grid-cols-[3fr_2fr]" : "lg:grid-cols-[2fr_3fr]"
        }`}
      >
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

        <Reveal group className={flip ? "lg:order-1" : undefined}>
          <ul className="flex justify-center gap-4 sm:gap-6">
            {shots.map(({ shot, alt, caption }, i) => (
              <li
                key={shot}
                data-reveal-child
                style={{ transitionDelay: `${i * 140}ms` }}
                className={`${PHONE_W} shrink-0`}
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
