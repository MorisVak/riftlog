/* eslint-disable @next/next/no-img-element --
 * Screenshots are pre-optimized by scripts/process-screenshots.mjs into
 * 1x/2x WebP pairs; a plain <img srcSet> serves exactly those files, which
 * next/image's own resizing would only duplicate. */
import { SCREENSHOTS, type ScreenshotName } from "./screenshots.generated";

/**
 * Portrait phone frame around a real app screenshot. The status bar is cropped
 * off every shot, so the frame draws its own top band with the island — it
 * never covers app content. Width/height come from the generated manifest so
 * the page doesn't shift while images load.
 */
export function PhoneFrame({
  shot,
  alt,
  className = "",
  glow = false,
  priority = false,
}: {
  shot: ScreenshotName;
  alt: string;
  className?: string;
  glow?: boolean;
  /** Above-the-fold shot (the hero): load eagerly with high priority. */
  priority?: boolean;
}) {
  const { width, height } = SCREENSHOTS[shot];
  const src = `/screenshots/${shot}.webp`;

  return (
    <div
      className={`relative w-full rounded-[2.25rem] border border-border bg-surface p-2.5 ${
        glow ? "shadow-accent-card" : ""
      } ${className}`}
    >
      <div className="overflow-hidden rounded-[1.75rem] bg-background">
        {/* Status-bar band with the island */}
        <div className="flex h-7 items-center justify-center" aria-hidden>
          <span className="h-[18px] w-20 rounded-full bg-accent-deep ring-1 ring-border" />
        </div>
        <img
          src={src}
          srcSet={`${src} 1x, /screenshots/${shot}@2x.webp 2x`}
          width={width}
          height={height}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}
