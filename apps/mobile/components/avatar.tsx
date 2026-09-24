import React from 'react';
import { View } from 'react-native';
import Icon from '@/components/icon';

type AvatarProps = {
  /** Diameter in points. */
  size?: number;
};

/**
 * The one avatar every account renders — profile, onboarding, and later match
 * mode and friend lists. It is always the same generic silhouette: Riftlog
 * stores no profile pictures and reads no provider image URLs, so there is
 * deliberately no image/uri prop to grow into.
 *
 * Decorative: the name beside it carries the meaning, so it's hidden from
 * screen readers.
 */
const Avatar = ({ size = 64 }: AvatarProps) => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    className="items-center justify-center overflow-hidden rounded-full border border-border bg-surface"
    // Dimensions only — they vary per call site, so they can't be a class.
    style={{ width: size, height: size }}
  >
    <Icon
      name="user"
      size={Math.round(size * 0.5)}
      className="text-ink-tertiary"
    />
  </View>
);

export default Avatar;
