import React from 'react';
import { Text, View } from 'react-native';
import type { CardRef } from '@riftlog/core';
import Icon from '@/components/icon';

type CardArtProps = {
  card: CardRef;
  /**
   * `thumb` sits inside a card row; `feature` is the large identity card in a
   * deck header (legend, chosen champion); `tile` fills a gallery cell (its
   * width comes from the parent) and, with no art, shows the card's name.
   */
  variant: 'thumb' | 'feature' | 'tile';
  /** `tile` only: the cell width, in points. */
  width?: number;
};

/**
 * The ONE place card art is decided.
 *
 * Today there is no art (no Riot API access), so this resolves nothing:
 * `thumb` renders nothing, keeping rows text-only, and `feature` renders a
 * card-shaped placeholder. When a card catalog lands, look the image up here —
 * by `card.code` when present, else by normalized name (text imports have no
 * code) — and every deck surface gains art with no other change.
 */
const resolveArt = (_card: CardRef): null => null;

const CardArt = ({ card, variant, width }: CardArtProps) => {
  const art = resolveArt(card);

  if (variant === 'thumb') {
    // No art → no thumbnail; the row is just count + name.
    return art;
  }

  if (variant === 'tile') {
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
        <Text
          className="text-center font-display text-[12px] leading-4 text-ink-primary"
          numberOfLines={3}
        >
          {head?.trim()}
        </Text>
        {title !== '' && (
          <Text
            className="text-center text-[10px] leading-[13px] text-ink-secondary"
            numberOfLines={2}
          >
            {title}
          </Text>
        )}
      </View>
    );
  }

  // Card proportions (63 × 88 mm).
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

export default CardArt;
