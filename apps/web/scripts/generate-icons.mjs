// Builds every Riftlog icon from one source: the in-app wordmark badge — a
// periwinkle rounded square with Feather's hexagon in it (Home header,
// apps/mobile/app/(tabs)/index.tsx; web Wordmark.tsx).
//
//   pnpm --filter @riftlog/web icons
//
// Writes:
//   apps/web/src/app/favicon.ico, icon.svg           browser tab
//   apps/web/src/app/apple-icon.png                  iOS home screen bookmark
//   apps/mobile/assets/images/icon.png               iOS app icon (full bleed)
//   apps/mobile/assets/images/android-icon-*.png     Android adaptive layers
//   apps/mobile/assets/images/splash-icon.png        launch screen mark
//   apps/mobile/assets/images/favicon.png            Expo web favicon
//
// Colors mirror the design tokens (apps/mobile/tailwind.config.js):
// accent #8B93D9 and background #0D1B2A. Change them there first.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WEB = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MOBILE_IMAGES = path.join(WEB, "..", "mobile", "assets", "images");

const ACCENT = "#8B93D9"; // token: accent
const INK = "#0D1B2A"; // token: background (the hexagon is cut in it)

// Feather "hexagon", drawn on its 24×24 grid.
const HEX_PATH =
  "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z";

/**
 * One square SVG. `radius` rounds the badge (0 = full bleed, for iOS which
 * masks its own corners; null = no badge, transparent). `hex` is the
 * hexagon's size as a share of the canvas; the stroke matches the wordmark's
 * 2.5 on Feather's 24 grid.
 */
function svg({ size, radius, hex, bg = ACCENT, fg = INK }) {
  const hexPx = size * hex;
  const offset = (size - hexPx) / 2;
  const scale = hexPx / 24;
  const badge =
    radius === null ? "" : `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${badge}<g transform="translate(${offset} ${offset}) scale(${scale})"><path d="${HEX_PATH}" fill="none" stroke="${fg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}

const png = (markup) => sharp(Buffer.from(markup)).png();

/** A single-image .ico wrapping a PNG (supported by every current browser). */
function ico(pngData, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(size, 6); // width
  header.writeUInt8(size, 7); // height
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(pngData.length, 14);
  header.writeUInt32LE(22, 18); // image data offset
  return Buffer.concat([header, pngData]);
}

async function main() {
  await mkdir(MOBILE_IMAGES, { recursive: true });

  // Badge proportions from the wordmark: 30px square, 9px radius, 16px hexagon.
  const badge = (size) => svg({ size, radius: size * 0.3, hex: 16 / 30 });

  const outputs = [
    // Web: /favicon.ico for browsers that ask for it, SVG for the rest.
    [path.join(WEB, "src/app/favicon.ico"), ico(await png(badge(32)).toBuffer(), 32)],
    [path.join(WEB, "src/app/icon.svg"), Buffer.from(badge(64))],
    // Apple touch icon: opaque; iOS rounds it.
    [path.join(WEB, "src/app/apple-icon.png"), await png(svg({ size: 180, radius: 0, hex: 0.5 })).toBuffer()],
    // iOS app icon: full bleed, opaque; iOS applies the rounded mask.
    [path.join(MOBILE_IMAGES, "icon.png"), await png(svg({ size: 1024, radius: 0, hex: 0.5 })).flatten({ background: ACCENT }).toBuffer()],
    // Android adaptive: solid background layer + a hexagon inside the 66% safe zone.
    [path.join(MOBILE_IMAGES, "android-icon-background.png"), await sharp({ create: { width: 1024, height: 1024, channels: 4, background: ACCENT } }).png().toBuffer()],
    [path.join(MOBILE_IMAGES, "android-icon-foreground.png"), await png(svg({ size: 1024, radius: null, hex: 0.36 })).toBuffer()],
    [path.join(MOBILE_IMAGES, "android-icon-monochrome.png"), await png(svg({ size: 1024, radius: null, hex: 0.36, fg: "#FFFFFF" })).toBuffer()],
    // Launch screen: the badge itself, on the app's dark background (app.json).
    [path.join(MOBILE_IMAGES, "splash-icon.png"), await png(badge(1024)).toBuffer()],
    [path.join(MOBILE_IMAGES, "favicon.png"), await png(badge(48)).toBuffer()],
  ];

  for (const [file, data] of outputs) {
    await writeFile(file, data);
    console.log(`✓ ${path.relative(path.join(WEB, ".."), file)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
