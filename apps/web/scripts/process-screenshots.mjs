// Turns raw iPhone screenshots into the site's optimized WebP pairs.
//
//   pnpm --filter @riftlog/web screenshots
//
// Reads  apps/web/screenshots-raw/<name>.png  (gitignored — real phone data)
// Writes apps/web/public/screenshots/<name>.webp     (1x, OUT_WIDTH wide)
//        apps/web/public/screenshots/<name>@2x.webp  (2x)
//        src/components/screenshots.generated.ts     (names + 1x sizes, so
//        PhoneFrame can set width/height and the page never shifts)
//        assets/og-board.png                         (the board as PNG for
//        src/app/opengraph-image.tsx, which can't read WebP)
//        apps/web/public/screenshots/details/<name>(@2x).webp
//                                                    (DETAILS: one part of a
//        screen, for the feature tiles; sizes go in the same manifest)
//
// The iOS status bar (time, battery, carrier, notification icons) is cropped
// off the top; PhoneFrame draws its own island. A landscape shot is captured
// the same way (simctl saves it portrait-oriented, island on top), so the same
// crop removes the island before it's turned on its side. Only names listed in SHOTS are
// processed, so a stray file in the raw folder never reaches the site.

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RAW_DIR = path.join(ROOT, "screenshots-raw");
const OUT_DIR = path.join(ROOT, "public", "screenshots");
const MANIFEST = path.join(ROOT, "src", "components", "screenshots.generated.ts");
const OG_BOARD = path.join(ROOT, "assets", "og-board.png");

const OUT_WIDTH = 390;
const OUT_WIDTH_LANDSCAPE = 796;
const QUALITY = 80;

// Shots are taken in the app's demo mode (apps/mobile/lib/demo.ts):
// fictional opponents, so nothing needs blurring — `blur` stays for a shot
// that shows real people's names.
//
// iOS status bar height in points on Dynamic Island iPhones. Raw pixels are
// points × the device scale, which is derived from the screenshot width.
const STATUS_BAR_PT = 54;

/**
 * The shot list (see the plan). `cropTopPt` overrides the status-bar crop for
 * a screen whose content starts higher than the usual safe area. `blur` lists
 * boxes, in RAW pixels, to blur before anything else — other people's names.
 * `rotate` turns a landscape shot upright (degrees clockwise) after cropping;
 * its 1x width is then OUT_WIDTH_LANDSCAPE.
 * @typedef {{ left: number, top: number, width: number, height: number }} Box
 * @type {Record<string, { cropTopPt?: number, blur?: Box[], rotate?: number }>}
 */
const SHOTS = {
  home: {},
  setup: {},
  // The hero's phones show the whole screen, island included (the board
  // hides the status bar, and simctl captures the island), so PhoneFrame
  // draws no band of its own: `cropTopPt: 0`.
  board: { cropTopPt: 0 },
  // The board held sideways. Captured with cmd+← in the Simulator, so the
  // island is at the top of the raw file and the content turns upright
  // counter-clockwise (270°); a cmd+→ capture would need 90.
  "board-landscape": { cropTopPt: 0, rotate: 270 },
  "who-won": {},
  // The opponent's upside-down clock sits right under the status bar.
  "between-games": { cropTopPt: 50 },
  "between-games-landscape": { rotate: 270 },
  "match-complete": {},
  history: {},
  "history-filters": {},
  "match-detail": {},
  decks: {},
  deck: {},
  "deck-gallery": {},
  "card-sheet": {},
  "legend-art": {},
};

/**
 * Parts of a screen for the feature tiles: a box in 1x points on the
 * processed shot (390 wide, status bar already cropped — read it off the
 * 1x WebP), cut from the raw file so the 2x copy stays sharp. Pick boxes
 * along natural edges (a card's border, a gap between sections).
 * @type {Record<string, { from: keyof typeof SHOTS, x: number, y: number, w: number, h: number }>}
 */
const DETAILS = {
  // At the table
  "setup-legends": { from: "setup", x: 8, y: 158, w: 374, h: 230 },
  "board-score": { from: "board", x: 30, y: 499, w: 330, h: 335 },
  "setup-format": { from: "setup", x: 8, y: 545, w: 374, h: 158 },
  "who-won": { from: "who-won", x: 43, y: 190, w: 304, h: 366 },
  between: { from: "between-games", x: 8, y: 50, w: 374, h: 452 },
  // After the match
  "home-matches": { from: "home", x: 8, y: 224, w: 374, h: 300 },
  "history-rows": { from: "history", x: 0, y: 110, w: 390, h: 264 },
  filters: { from: "history-filters", x: 0, y: 35, w: 390, h: 495 },
  graph: { from: "match-detail", x: 8, y: 295, w: 374, h: 310 },
  notes: { from: "match-complete", x: 8, y: 500, w: 374, h: 189 },
  // Your decks
  "decks-list": { from: "decks", x: 8, y: 105, w: 374, h: 280 },
  gallery: { from: "deck-gallery", x: 20, y: 55, w: 350, h: 300 },
  card: { from: "card-sheet", x: 15, y: 20, w: 360, h: 560 },
  "default-deck": { from: "home", x: 8, y: 50, w: 374, h: 160 },
  "legend-art": { from: "legend-art", x: 8, y: 100, w: 374, h: 394 },
};

/** Returns the image with each box blurred beyond reading, as a PNG buffer. */
async function blurBoxes(file, boxes) {
  const overlays = await Promise.all(
    boxes.map(async (box) => ({
      input: await sharp(file).extract(box).blur(20).toBuffer(),
      left: box.left,
      top: box.top,
    })),
  );
  return sharp(file).composite(overlays).png().toBuffer();
}

/** Every current iPhone renders at 3x except the base 1x/2x widths below. */
function deviceScale(width) {
  return width <= 828 ? 2 : 3;
}

async function main() {
  const files = new Set(await readdir(RAW_DIR).catch(() => []));
  await mkdir(OUT_DIR, { recursive: true });

  const manifest = {};
  const missing = [];
  /** Each processed portrait shot's blurred raw and status-bar crop, for DETAILS. */
  const sources = {};

  for (const [name, opts] of Object.entries(SHOTS)) {
    const file = [`${name}.png`, `${name}.PNG`].find((f) => files.has(f));
    if (!file) {
      missing.push(name);
      continue;
    }

    const input = await blurBoxes(path.join(RAW_DIR, file), opts.blur ?? []);
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) throw new Error(`${file}: unreadable size`);

    const cropTop = Math.round((opts.cropTopPt ?? STATUS_BAR_PT) * deviceScale(meta.width));
    const cropped = { left: 0, top: cropTop, width: meta.width, height: meta.height - cropTop };
    const rotate = opts.rotate ?? 0;
    const outWidth = rotate ? OUT_WIDTH_LANDSCAPE : OUT_WIDTH;
    // Upright size of the cropped image, after any quarter turn.
    const [w, h] = rotate % 180 ? [cropped.height, cropped.width] : [cropped.width, cropped.height];

    for (const [suffix, width] of [["", outWidth], ["@2x", outWidth * 2]]) {
      // A fresh pipeline per extract: sharp applies rotate before extract
      // within one chain, so the crop runs on its own buffer first.
      const croppedBuf = await sharp(input).extract(cropped).toBuffer();
      await sharp(croppedBuf)
        .rotate(rotate)
        .resize({ width })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(path.join(OUT_DIR, `${name}${suffix}.webp`));
    }

    if (name === "board") {
      // The link preview keeps the island off.
      const top = Math.round(STATUS_BAR_PT * deviceScale(meta.width));
      const og = { left: 0, top, width: meta.width, height: meta.height - top };
      await sharp(input).extract(og).resize({ width: 520 }).png().toFile(OG_BOARD);
    }

    if (!rotate) sources[name] = { input, cropTop, scale: meta.width / OUT_WIDTH };

    manifest[name] = {
      width: outWidth,
      height: Math.round((h * outWidth) / w),
    };
    console.log(`✓ ${name}  (${meta.width}×${meta.height}, cropped ${cropTop}px)`);
  }

  const details = {};
  await mkdir(path.join(OUT_DIR, "details"), { recursive: true });
  for (const [name, d] of Object.entries(DETAILS)) {
    const src = sources[d.from];
    if (!src) {
      missing.push(`${name} (needs ${d.from})`);
      continue;
    }
    const box = {
      left: Math.round(d.x * src.scale),
      top: src.cropTop + Math.round(d.y * src.scale),
      width: Math.round(d.w * src.scale),
      height: Math.round(d.h * src.scale),
    };
    for (const [suffix, width] of [["", d.w], ["@2x", d.w * 2]]) {
      await sharp(src.input)
        .extract(box)
        .resize({ width })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(path.join(OUT_DIR, "details", `${name}${suffix}.webp`));
    }
    details[name] = { width: d.w, height: d.h };
    console.log(`✓ detail ${name}  (from ${d.from})`);
  }

  const body =
    "// GENERATED by scripts/process-screenshots.mjs — DO NOT EDIT.\n" +
    "// Re-run: pnpm --filter @riftlog/web screenshots\n\n" +
    `export const SCREENSHOTS = ${JSON.stringify(manifest, null, 2)} as const;\n\n` +
    "export type ScreenshotName = keyof typeof SCREENSHOTS;\n\n" +
    `export const DETAILS = ${JSON.stringify(details, null, 2)} as const;\n\n` +
    "export type DetailName = keyof typeof DETAILS;\n";
  await writeFile(MANIFEST, body);

  if (missing.length) console.warn(`\nMissing raw shots: ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
