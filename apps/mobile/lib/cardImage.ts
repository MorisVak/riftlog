import { PixelRatio } from 'react-native';
import { SMALL_CARD_IMAGE_PX, smallCardImagePath, type CatalogPrinting } from '@riftlog/core';
import { supabase } from '@/lib/supabase';

/**
 * The URLs to try, in order, for a printing's art shown `widthPt` points
 * wide. Every card image goes through here.
 *
 * Self-hosted art comes first: our `card-images` bucket keeps every printing
 * full size and small (`storage_path`, see `cardImagePath` in
 * @riftlog/core) — the small copy for row thumbnails, the full one for
 * everything bigger. Riot's card CDN (`image_url`) is only the fallback, for
 * printings not copied yet or a bucket hiccup.
 */

const BUCKET = 'card-images';

/** Riot's card art CDN is a Sanity image CDN: it resizes and converts on request. */
const SANITY = /^https:\/\/cmsassets\.rgpub\.io\//;

const bucketUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/**
 * Riot's URL as a WebP at `px` pixels wide. Plain string handling on purpose:
 * React Native's URL class doesn't implement `searchParams.set`.
 */
const sizedRiotUrl = (url: string, px: number): string => {
  if (!SANITY.test(url)) return url;
  const [path, query = ''] = url.split('?', 2);
  const kept = query.split('&').filter((p) => p !== '' && !/^(w|fm)=/.test(p));
  return `${path}?${[...kept, `w=${px}`, 'fm=webp'].join('&')}`;
};

export function cardImageUrls(
  printing: Pick<CatalogPrinting, 'storage_path' | 'image_url'>,
  widthPt: number,
): string[] {
  const px = Math.ceil(PixelRatio.getPixelSizeForLayoutSize(widthPt));
  const urls: string[] = [];
  if (printing.storage_path) {
    if (px <= SMALL_CARD_IMAGE_PX) urls.push(bucketUrl(smallCardImagePath(printing.storage_path)));
    urls.push(bucketUrl(printing.storage_path));
  }
  if (printing.image_url) {
    urls.push(sizedRiotUrl(printing.image_url, px), printing.image_url);
  }
  return [...new Set(urls)];
}
