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
//
// Every shot keeps the whole screen, Dynamic Island included (simctl captures
// it), so PhoneFrame draws nothing over it. The Simulator's 9:41 status-bar
// override drops off after a rotation, so some shots have the time and some
// don't: `hideStatusBar` paints the time and icons out in the color behind
// them, so every phone looks the same. Only names listed in SHOTS are
// processed, so a stray file in the raw folder never reaches the site.

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
 * The shot list. `blur` lists boxes, in RAW pixels, to blur before anything
 * else — other people's names. `hideStatusBar` paints out the status bar's
 * time and icons (either side of the island). `rotate` turns a landscape
 * shot upright (degrees clockwise); its 1x width is then OUT_WIDTH_LANDSCAPE.
 * @typedef {{ left: number, top: number, width: number, height: number }} Box
 * @type {Record<string, { blur?: Box[], hideStatusBar?: boolean, rotate?: number }>}
 */
const SHOTS = {
  home: {},
  setup: {},
  board: {},
  // The board held sideways. Captured with cmd+← in the Simulator, so the
  // island is at the top of the raw file and the content turns upright
  // counter-clockwise (270°); a cmd+→ capture would need 90.
  "board-landscape": { rotate: 270 },
  "who-won": {},
  "between-games": {},
  "between-games-landscape": { rotate: 270 },
  "match-complete": {},
  history: {},
  "history-filters": { hideStatusBar: true },
  "match-detail": { hideStatusBar: true },
  decks: {},
  deck: { hideStatusBar: true },
  "deck-gallery": { hideStatusBar: true },
  "card-sheet": { hideStatusBar: true },
  "legend-art": { hideStatusBar: true },
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

/**
 * Paints the status bar's time (left of the island) and icons (right of it)
 * in the color just below them, as if the status bar were empty.
 */
async function hideStatusBar(buf) {
  const meta = await sharp(buf).metadata();
  const scale = deviceScale(meta.width);
  const height = Math.round(STATUS_BAR_PT * scale);
  const islandLeft = Math.round(meta.width * 0.3);
  const islandRight = Math.round(meta.width * 0.7);
  const { data } = await sharp(buf)
    .extract({ left: Math.round(meta.width / 2), top: height + 2, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2] };
  const patch = (width) =>
    sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();
  return sharp(buf)
    .composite([
      { input: await patch(islandLeft), left: 0, top: 0 },
      { input: await patch(meta.width - islandRight), left: islandRight, top: 0 },
    ])
    .png()
    .toBuffer();
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

  for (const [name, opts] of Object.entries(SHOTS)) {
    const file = [`${name}.png`, `${name}.PNG`].find((f) => files.has(f));
    if (!file) {
      missing.push(name);
      continue;
    }

    const blurred = await blurBoxes(path.join(RAW_DIR, file), opts.blur ?? []);
    const input = opts.hideStatusBar ? await hideStatusBar(blurred) : blurred;
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) throw new Error(`${file}: unreadable size`);

    const cropped = { left: 0, top: 0, width: meta.width, height: meta.height };
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

    // A short hash of the 2x file: PhoneFrame adds it to the URL, so a
    // retaken shot under the same name is never served stale from a cache.
    const v = createHash("sha256")
      .update(await readFile(path.join(OUT_DIR, `${name}@2x.webp`)))
      .digest("hex")
      .slice(0, 8);

    manifest[name] = {
      width: outWidth,
      height: Math.round((h * outWidth) / w),
      v,
    };
    console.log(`✓ ${name}  (${meta.width}×${meta.height}${opts.hideStatusBar ? ", status bar hidden" : ""})`);
  }

  const body =
    "// GENERATED by scripts/process-screenshots.mjs — DO NOT EDIT.\n" +
    "// Re-run: pnpm --filter @riftlog/web screenshots\n\n" +
    `export const SCREENSHOTS = ${JSON.stringify(manifest, null, 2)} as const;\n\n` +
    "export type ScreenshotName = keyof typeof SCREENSHOTS;\n";
  await writeFile(MANIFEST, body);

  if (missing.length) console.warn(`\nMissing raw shots: ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
