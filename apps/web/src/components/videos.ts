import type { ScreenshotName } from "./screenshots.generated";

/**
 * The looping clips in public/videos/ (MP4 + WebM, silent), cut from
 * Simulator recordings with ffmpeg — see "Screenshots and recordings" in
 * apps/web/CLAUDE.md. Sizes are 1x (the files are 2x), like the screenshot
 * manifest, so frames never shift; `poster` is the still shown before a clip
 * plays and when motion is reduced. Bump `v` whenever a clip is re-cut:
 * it's added to the URL, so no browser or CDN serves the old file.
 */
export const VIDEOS = {
  /** The game-start versus intro, held sideways (game 2), the whole screen. */
  intro: { width: 796, height: 367, poster: "board-landscape", v: 4 },
} as const satisfies Record<string, { width: number; height: number; poster: ScreenshotName; v: number }>;

export type VideoName = keyof typeof VIDEOS;
