/**
 * Where a printing's art lives in our `card-images` storage bucket. Every
 * printing is stored twice: full size for the card sheet, gallery tiles and
 * identity cards, and small for list rows — the bucket can't resize on
 * request. The importer writes these paths and the app reads them, so the
 * rule lives here once.
 *
 *   cards/SFD-149a.webp          full (744 px wide)
 *   cards/small/SFD-149a.webp    small (240 px wide)
 *
 * `*` (signed) is written `s` in file names: `UNL-229*` → `UNL-229s.webp`.
 */

/** Width of the small copy, in pixels. */
export const SMALL_CARD_IMAGE_PX = 240;

/** The full-size path for a printing code (what `storage_path` holds). */
export const cardImagePath = (code: string): string => `cards/${code.replace(/\*/g, 's')}.webp`;

/** The small copy next to a full-size path (`cards/X.webp` → `cards/small/X.webp`). */
export const smallCardImagePath = (storagePath: string): string =>
  storagePath.replace(/^cards\//, 'cards/small/');
