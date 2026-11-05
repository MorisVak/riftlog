/* eslint-disable @next/next/no-img-element --
 * Details are pre-optimized 1x/2x WebP pairs (scripts/process-screenshots.mjs);
 * a plain <img srcSet> serves exactly those files. */
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { DETAILS, type DetailName } from "./screenshots.generated";

/**
 * One feature: what it does, beside the part of the app that does it. The
 * picture is a tight crop of a real screen (`DETAILS`), not a whole phone —
 * one claim, one piece of UI, so the eye goes straight to what the text
 * talks about. A feature with nothing to show (yet) is text only.
 */
export type FeatureTile = {
  title: string;
  body: ReactNode;
} & ({ detail: DetailName; alt: string } | { detail?: never; alt?: never });

/** A part of a screen, at the size it has in the app. */
function DetailShot({ name, alt }: { name: DetailName; alt: string }) {
  const { width, height } = DETAILS[name];
  return (
    <img
      src={`/screenshots/details/${name}.webp`}
      srcSet={`/screenshots/details/${name}.webp 1x, /screenshots/details/${name}@2x.webp 2x`}
      width={width}
      height={height}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="mx-auto block h-auto w-full max-w-[390px] rounded-xl"
    />
  );
}

/**
 * One feature area of the one-pager: a heading and intro, then its features
 * as tiles in a masonry grid (CSS columns, so tall and short pictures pack
 * without gaps). Phones are kept for the hero and the face-off.
 */
export function FeatureSection({
  id,
  eyebrow,
  title,
  intro,
  tiles,
  footnote,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  tiles: FeatureTile[];
  footnote?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-display text-sm font-semibold uppercase tracking-widest text-accent-soft">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-primary sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 font-display text-lg leading-relaxed text-ink-secondary">
              {intro}
            </p>
          </div>
          {footnote && <div className="shrink-0">{footnote}</div>}
        </Reveal>

        <div className="mt-12 gap-6 sm:columns-2 lg:columns-3">
          {tiles.map((t, i) => (
            <Reveal
              key={t.title}
              delay={(i % 3) * 90}
              className="mb-6 break-inside-avoid"
            >
              <figure className="overflow-hidden rounded-2xl border border-border bg-surface">
                {t.detail && (
                  <div className="border-b border-border/60 bg-background p-3 sm:p-4">
                    <DetailShot name={t.detail} alt={t.alt} />
                  </div>
                )}
                <figcaption className="p-5">
                  <h3 className="font-display text-base font-semibold text-ink-primary">
                    {t.title}
                  </h3>
                  <p className="mt-1.5 font-display text-[15px] leading-relaxed text-ink-secondary">
                    {t.body}
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
