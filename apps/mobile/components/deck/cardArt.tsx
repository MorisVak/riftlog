import React from 'react';
import { View } from 'react-native';
import type { CardRef } from '@riftlog/core';
import Icon from '@/components/icon';

type CardArtProps = {
  card: CardRef;
  /**
   * `thumb` sits inside a card row; `feature` is the large identity card in a
   * deck header (legend, chosen champion).
   */
  variant: 'thumb' | 'feature';
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

const CardArt = ({ card, variant }: CardArtProps) => {
  const art = resolveArt(card);

  if (variant === 'thumb') {
    // No art → no thumbnail; the row is just count + name.
    return art;
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
