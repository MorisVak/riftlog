import React from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import { DOMAINS, type Domain, type DomainCount } from '@riftlog/core';

/**
 * Riot's official domain icons (64 px, from the card gallery's data). Static
 * requires: Metro can't bundle a path built at runtime. A dual-domain card
 * simply shows two of these — there are no separate dual icons.
 */
const DOMAIN_ICONS: Record<Domain, ImageSourcePropType> = {
  fury: require('@/assets/domains/fury.png'),
  calm: require('@/assets/domains/calm.png'),
  mind: require('@/assets/domains/mind.png'),
  body: require('@/assets/domains/body.png'),
  chaos: require('@/assets/domains/chaos.png'),
  order: require('@/assets/domains/order.png'),
};

/** A catalog domain name ("Fury", "Colorless") as a Domain, if it is one. */
export const asDomain = (name: string): Domain | null => {
  const d = name.toLowerCase();
  return (DOMAINS as readonly string[]).includes(d) ? (d as Domain) : null;
};

/** One domain's icon. Decorative: whatever shows it also says the name. */
export const DomainIcon = ({ domain, size = 14 }: { domain: Domain; size?: number }) => (
  <Image
    source={DOMAIN_ICONS[domain]}
    style={{ width: size, height: size }}
    accessible={false}
    importantForAccessibility="no"
  />
);

/** A card's one or two domain icons side by side (Colorless shows none). */
export const DomainIcons = ({ domains, size = 14 }: { domains: string[]; size?: number }) => {
  const known = domains.map(asDomain).filter((d): d is Domain => d !== null);
  if (known.length === 0) return null;
  return (
    <View className="flex-row items-center gap-0.5">
      {known.map((d) => (
        <DomainIcon key={d} domain={d} size={size} />
      ))}
    </View>
  );
};

/**
 * Full class names per domain. NativeWind only compiles classes that appear
 * literally in source, so these can't be built as `bg-domain-${d}`.
 */
export const DOMAIN_CLASSES: Record<
  Domain,
  { solid: string; tint: string; text: string }
> = {
  fury: { solid: 'bg-domain-fury', tint: 'bg-domain-fury-tint', text: 'text-domain-fury' },
  calm: { solid: 'bg-domain-calm', tint: 'bg-domain-calm-tint', text: 'text-domain-calm' },
  mind: { solid: 'bg-domain-mind', tint: 'bg-domain-mind-tint', text: 'text-domain-mind' },
  body: { solid: 'bg-domain-body', tint: 'bg-domain-body-tint', text: 'text-domain-body' },
  chaos: { solid: 'bg-domain-chaos', tint: 'bg-domain-chaos-tint', text: 'text-domain-chaos' },
  order: { solid: 'bg-domain-order', tint: 'bg-domain-order-tint', text: 'text-domain-order' },
};

export const domainLabel = (d: Domain): string =>
  d.charAt(0).toUpperCase() + d.slice(1);

/** A domain's icon and name on its tint. The name, not the color, carries meaning. */
export const DomainChip = ({ domain }: { domain: Domain }) => (
  <View className={`flex-row items-center gap-1 rounded-full py-1 pl-1.5 pr-2.5 ${DOMAIN_CLASSES[domain].tint}`}>
    <DomainIcon domain={domain} size={14} />
    <Text className={`font-display text-[12px] ${DOMAIN_CLASSES[domain].text}`}>
      {domainLabel(domain)}
    </Text>
  </View>
);

export const DomainChips = ({ domains }: { domains: DomainCount[] }) => (
  <View className="flex-row flex-wrap gap-1.5">
    {domains.map((d) => (
      <DomainChip key={d.domain} domain={d.domain} />
    ))}
  </View>
);

/**
 * The rune split as one bar, a segment per domain sized by count. Decorative:
 * the "9× Chaos · 3× Order" text beside it says the same thing in words.
 */
export const RuneBar = ({ domains }: { domains: DomainCount[] }) => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    className="h-2 flex-row gap-0.5 overflow-hidden rounded-full"
  >
    {domains.map((d) => (
      <View
        key={d.domain}
        className={DOMAIN_CLASSES[d.domain].solid}
        style={{ flex: d.count }}
      />
    ))}
  </View>
);
