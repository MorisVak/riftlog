/**
 * Self-hosting card art: each printing's image is downloaded once from its
 * `image_url` (Riot's card CDN, which resizes and converts on request) and
 * stored in our `card-images` bucket in two sizes (see `cardImagePath` in
 * @riftlog/core). Pure helpers here; images-cli.ts does the I/O.
 */
import { SMALL_CARD_IMAGE_PX } from '@riftlog/core';

/** Width of the full-size copy, in pixels (the card's own width). */
export const FULL_CARD_IMAGE_PX = 744;

/** Riot's card CDN (a Sanity image CDN). */
const SANITY = /^https:\/\/cmsassets\.rgpub\.io\//;

/**
 * The URL that returns this image as a WebP `width` pixels wide, or null if
 * the image isn't on Riot's resizing CDN. Keeps the URL's other parameters.
 */
export function sizedWebpUrl(imageUrl: string, width: number): string | null {
  if (!SANITY.test(imageUrl)) return null;
  const [path, query = ''] = imageUrl.split('?', 2);
  const kept = query.split('&').filter((p) => p !== '' && !/^(w|fm|q)=/.test(p));
  return `${path}?${[...kept, `w=${width}`, 'fm=webp', 'q=80'].join('&')}`;
}

/** Both downloads for a printing: full and small. */
export const downloadUrls = (imageUrl: string) => ({
  full: sizedWebpUrl(imageUrl, FULL_CARD_IMAGE_PX),
  small: sizedWebpUrl(imageUrl, SMALL_CARD_IMAGE_PX),
});
