import type { ReactNode } from "react";
import { PhoneFrame } from "./PhoneFrame";
import { Reveal } from "./Reveal";
import type { ScreenshotName } from "./screenshots.generated";

export type FeaturePoint = { title: string; body: ReactNode };
/** A still of the app. Feature rows show stills only: clips here read as noisy. */
export type FeatureShot = { shot: ScreenshotName; alt: string; caption: string };

/**
 * Every phone on the page is this wide — the same size in every row (rows
 * hold four, which fit the desktop content width; on phones they scroll).
 */
const PHONE_W = "w-[250px]";

/**
 * One feature area of the one-pager: heading + intro beside a list of points,
 * then a row of real screenshots. On narrow screens the phones scroll
 * sideways (snapping) instead of shrinking past readability.
 */
export function FeatureSection({
  id,
  eyebrow,
  title,
  intro,
  points,
  shots,
  footnote,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: FeaturePoint[];
  shots: FeatureShot[];
  footnote?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
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
            {footnote && <div className="mt-6">{footnote}</div>}
          </Reveal>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
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
          className="-mx-5 mt-14 snap-x snap-mandatory overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0"
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
