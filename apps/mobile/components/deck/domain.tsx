import React from 'react';
import { Text, View } from 'react-native';
import type { Domain, DomainCount } from '@riftlog/core';

/**
 * Full class names per domain. NativeWind only compiles classes that appear
 * literally in source, so these can't be built as `bg-domain-${d}`.
 */
const DOMAIN_CLASSES: Record<
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

/** A domain's name on its tint. The name, not the color, carries meaning. */
export const DomainChip = ({ domain }: { domain: Domain }) => (
  <View className={`rounded-full px-2.5 py-1 ${DOMAIN_CLASSES[domain].tint}`}>
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
