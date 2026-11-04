import { describe, expect, it } from 'vitest';
import { downloadUrls, sizedWebpUrl } from './images';

const RIOT = 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0c9a-744x1039.png?accountingTag=RB';

describe('card art downloads', () => {
  it('asks Riot’s card CDN for a WebP of the given width, keeping its other parameters', () => {
    expect(sizedWebpUrl(RIOT, 240)).toBe(`${RIOT}&w=240&fm=webp&q=80`);
    expect(sizedWebpUrl(`${RIOT}&w=99&fm=png`, 744)).toBe(`${RIOT}&w=744&fm=webp&q=80`);
    expect(downloadUrls(RIOT)).toEqual({ full: `${RIOT}&w=744&fm=webp&q=80`, small: `${RIOT}&w=240&fm=webp&q=80` });
  });

  it('only resizes images on Riot’s card CDN', () => {
    expect(sizedWebpUrl('https://example.com/card.png', 240)).toBeNull();
  });
});
