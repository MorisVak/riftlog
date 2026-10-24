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
  board: {},
  // The board held sideways (cmd+→ in the Simulator: island on the right).
  "board-landscape": { rotate: 90 },
  // The opponent's upside-down clock sits right under the status bar.
  "between-games": { cropTopPt: 50 },
  setup: {},
  // Opponent names that may be real people ("Dome", "Joeli", "Sam").
  history: {
    blur: [
      { left: 258, top: 1514, width: 200, height: 58 },
      { left: 258, top: 1732, width: 200, height: 58 },
      { left: 258, top: 2391, width: 200, height: 58 },
    ],
  },
  "match-detail": {},
  deck: {},
  "deck-changes": {},
  "my-decks": {},
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
      await sharp(input).extract(cropped).resize({ width: 520 }).png().toFile(OG_BOARD);
    }

    manifest[name] = {
      width: outWidth,
      height: Math.round((h * outWidth) / w),
    };
    console.log(`✓ ${name}  (${meta.width}×${meta.height}, cropped ${cropTop}px)`);
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
