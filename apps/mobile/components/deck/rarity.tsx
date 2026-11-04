import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

/**
 * Riot's rarity gems (from the card gallery's data, 64 px wide). Keyed by the
 * catalog's `rarity` text; "Promo" (and anything unknown) has no gem.
 */
const RARITY_ICONS: Record<string, { source: ImageSourcePropType; aspect: number }> = {
  common: { source: require('@/assets/rarity/common.png'), aspect: 1 },
  uncommon: { source: require('@/assets/rarity/uncommon.png'), aspect: 480 / 410 },
  rare: { source: require('@/assets/rarity/rare.png'), aspect: 429 / 425 },
  epic: { source: require('@/assets/rarity/epic.png'), aspect: 455 / 419 },
  showcase: { source: require('@/assets/rarity/showcase.png'), aspect: 376 / 426 },
};

/** A printing's rarity gem, `size` points tall; null when the rarity has none. */
const RarityIcon = ({ rarity, size = 14 }: { rarity: string | null; size?: number }) => {
  const icon = rarity ? RARITY_ICONS[rarity.toLowerCase()] : undefined;
  if (!icon) return null;
  return (
    <Image
      source={icon.source}
      style={{ width: size * icon.aspect, height: size }}
      accessibilityLabel={rarity ?? undefined}
    />
  );
};

export default RarityIcon;
