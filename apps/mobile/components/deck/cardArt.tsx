import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { CardRef, CatalogPrinting } from '@riftlog/core';
import Icon from '@/components/icon';
import { useCardMatch } from '@/hooks/useCardMatch';
import { cardImageUrls } from '@/lib/cardImage';
import { CARD_ART } from '@/lib/featureFlags';

type CardArtProps = {
  card: CardRef;
  /**
   * `thumb` sits inside a card row; `feature` is the identity card in a deck
   * header (legend, chosen champion); `tile` fills a gallery cell and `sheet`
   * the card details sheet (both take their width from `width`).
   */
  variant: 'thumb' | 'feature' | 'tile' | 'sheet';
  /** `tile` / `sheet`: the width, in points. */
  width?: number;
};

const THUMB_W = 30;
const FEATURE_W = 72;
/** Card proportions, 63 × 88 mm; battlefields are the same card turned sideways. */
const PORTRAIT = 88 / 63;

/**
 * The ONE place card art is decided. Every deck surface renders cards through
 * `CardRow` / `CardGrid` / the deck header / the card sheet → here.
 *
 * Art shows only with the CARD_ART flag on (dev and preview builds, see
 * lib/featureFlags.ts) and when the card matches the catalog: by code, else by
 * name to the card's base printing. Otherwise it's the placeholder it always
 * was — `thumb` renders nothing, so rows stay text-only.
 */
const CardArt = ({ card, variant, width }: CardArtProps) => {
  const { match } = useCardMatch(card);
  const printing = CARD_ART && match && match.kind !== 'unknown' ? match.printing : null;
  const landscape = printing?.orientation === 'landscape';

  if (printing && (printing.image_url || printing.storage_path)) {
    const w =
      variant === 'thumb'
        ? landscape
          ? THUMB_W * PORTRAIT
          : THUMB_W
        : variant === 'feature'
          ? FEATURE_W
          : (width ?? FEATURE_W);
    // A landscape card keeps its width and gets shorter.
    const h = landscape ? w / PORTRAIT : w * PORTRAIT;
    return (
      <CardImage
        printing={printing}
        width={w}
        height={h}
        rounded={variant === 'thumb' ? 'rounded-[3px]' : 'rounded-lg'}
      />
    );
  }

  if (variant === 'thumb') return null;

  if (variant === 'tile' || variant === 'sheet') {
    // Card-shaped placeholder that names the card, since there's no image to
    // tell tiles apart. "Champion, Title" breaks after the champion.
    const [head, ...rest] = card.name.split(',');
    const title = rest.join(',').trim();
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ width }}
        className="aspect-[63/88] items-center justify-center gap-1.5 rounded-lg border border-border bg-elevated px-2"
      >
        <Icon name="image" size={16} className="text-ink-tertiary" />
        <Text className="text-center font-display text-[12px] leading-4 text-ink-primary" numberOfLines={3}>
          {head?.trim()}
        </Text>
        {title !== '' && (
          <Text className="text-center text-[10px] leading-[13px] text-ink-secondary" numberOfLines={2}>
            {title}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="aspect-[63/88] w-[72px] items-center justify-center rounded-lg border border-border bg-elevated"
    >
      <Icon name="image" size={18} className="text-ink-tertiary" />
    </View>
  );
};

/**
 * One card image: the CDN-sized WebP first, the original URL if that fails,
 * and an empty card-shaped frame if both do.
 */
const CardImage = ({
  printing,
  width,
  height,
  rounded,
}: {
  printing: CatalogPrinting;
  width: number;
  height: number;
  rounded: string;
}) => {
  const urls = cardImageUrls(printing, width);
  const [attempt, setAttempt] = useState<'sized' | 'plain' | 'failed'>('sized');
  const uri = attempt === 'failed' || !urls ? null : urls[attempt];

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
      className={`overflow-hidden border border-border/60 bg-elevated ${rounded}`}
    >
      {uri && (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={120}
          recyclingKey={printing.code}
          onError={() => setAttempt((a) => (a === 'sized' && urls?.plain !== urls?.sized ? 'plain' : 'failed'))}
        />
      )}
    </View>
  );
};

export default CardArt;
