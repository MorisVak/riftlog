import type { ScreenshotName } from "./screenshots.generated";

/**
 * The looping clips in public/videos/ (MP4 + WebM, silent), cut from
 * Simulator recordings with ffmpeg — see "Screenshots and recordings" in
 * apps/web/CLAUDE.md. Sizes are 1x (the files are 2x), like the screenshot
 * manifest, so frames never shift; `poster` is the still shown before a clip
 * plays and when motion is reduced.
 */
export const VIDEOS = {
  /** The game-start versus intro, held sideways (game 2). */
  intro: { width: 796, height: 390, poster: "board-landscape" },
  /** Scoring with Conquer / Hold / Special, and a take-back. */
  scoring: { width: 390, height: 796, poster: "board" },
  /** END → "Who won game 1?" → the between-games screen. */
  "game-end": { width: 390, height: 796, poster: "between-games" },
} as const satisfies Record<string, { width: number; height: number; poster: ScreenshotName }>;

export type VideoName = keyof typeof VIDEOS;
