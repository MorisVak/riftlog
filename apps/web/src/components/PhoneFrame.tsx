/* eslint-disable @next/next/no-img-element --
 * Screenshots are pre-optimized by scripts/process-screenshots.mjs into
 * 1x/2x WebP pairs; a plain <img srcSet> serves exactly those files, which
 * next/image's own resizing would only duplicate. */
import { SCREENSHOTS, type ScreenshotName } from "./screenshots.generated";
import { LoopVideo } from "./LoopVideo";
import { VIDEOS, type VideoName } from "./videos";

/**
 * Phone frame around a real app screen, edge to edge: the shot (or clip) is
 * the whole screen, Dynamic Island included — the Simulator captures it — so
 * the frame draws nothing over it and leaves no empty band. Width/height
 * come from the manifests so the page doesn't shift while images load. Used
 * by the hero, the face-off and the feature beats.
 */
export function PhoneFrame({
  shot,
  video,
  alt,
  className = "",
  glow = false,
  priority = false,
}: {
  alt: string;
  className?: string;
  glow?: boolean;
  /** Above-the-fold shot (the hero): load eagerly with high priority. */
  priority?: boolean;
} & ({ shot: ScreenshotName; video?: never } | { video: VideoName; shot?: never })) {
  const { width, height } = video ? VIDEOS[video] : SCREENSHOTS[shot];

  return (
    <div
      className={`relative w-full rounded-[2.5rem] border border-border bg-surface p-2 ${
        glow ? "phone-glow" : ""
      } ${className}`}
    >
      {/* The screen's corners follow the frame's (outer radius − padding). */}
      <div
        className="overflow-hidden rounded-[2rem] bg-background"
      >
        {video ? (
          <LoopVideo name={video} label={alt} />
        ) : (
          <img
            src={`/screenshots/${shot}.webp?v=${SCREENSHOTS[shot].v}`}
            srcSet={`/screenshots/${shot}.webp?v=${SCREENSHOTS[shot].v} 1x, /screenshots/${shot}@2x.webp?v=${SCREENSHOTS[shot].v} 2x`}
            width={width}
            height={height}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="block h-auto w-full min-w-0"
          />
        )}
      </div>
    </div>
  );
}
