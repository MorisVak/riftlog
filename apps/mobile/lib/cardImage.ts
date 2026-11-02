import { PixelRatio } from 'react-native';
import type { CatalogPrinting } from '@riftlog/core';
import { supabase } from '@/lib/supabase';

/**
 * Where a printing's art lives, and the URL to load it at a given size.
 * Every card image goes through `cardImageUrls`, so our own uploads (the
 * `card-images` bucket) and Riot's CDN are handled in one place.
 */

const BUCKET = 'card-images';

/** Riot's card art CDN is a Sanity image CDN: it resizes and converts on request. */
const SANITY = /^https:\/\/cmsassets\.rgpub\.io\//;

/** The original image: our uploaded file if there is one, else the source URL. */
export function printingImageUrl(printing: Pick<CatalogPrinting, 'storage_path' | 'image_url'>): string | null {
  if (printing.storage_path) {
    return supabase.storage.from(BUCKET).getPublicUrl(printing.storage_path).data.publicUrl;
  }
  return printing.image_url;
}

/**
 * The URL to load for a card shown `widthPt` points wide — a WebP at the
 * device's pixel width where the CDN can resize — plus the plain URL to fall
 * back to if the sized one fails. Bucket images (no resizing on our plan) are
 * loaded as they are.
 *
 * Plain string handling on purpose: React Native's URL class doesn't
 * implement `searchParams.set`.
 */
export function cardImageUrls(
  printing: Pick<CatalogPrinting, 'storage_path' | 'image_url'>,
  widthPt: number,
): { sized: string; plain: string } | null {
  const plain = printingImageUrl(printing);
  if (!plain) return null;
  if (!SANITY.test(plain)) return { sized: plain, plain };
  const px = Math.ceil(PixelRatio.getPixelSizeForLayoutSize(widthPt));
  // Drop any w / fm already on the URL, keep the rest (e.g. accountingTag).
  const [path, query = ''] = plain.split('?', 2);
  const kept = query.split('&').filter((p) => p !== '' && !/^(w|fm)=/.test(p));
  return { sized: `${path}?${[...kept, `w=${px}`, 'fm=webp'].join('&')}`, plain };
}
