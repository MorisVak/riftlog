import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { CardRef, Domain } from '@riftlog/core';
import Icon from '@/components/icon';
import CardArt from '@/components/deck/cardArt';
import CardText from '@/components/deck/cardText';
import { DomainIcons, RuneIcon, asDomain, domainLabel } from '@/components/deck/domain';
import RarityIcon from '@/components/deck/rarity';
import { useCardMatch } from '@/hooks/useCardMatch';

/**
 * A card's details: art (with the flag on), name, type line, stats and the
 * current rules text from the catalog. Opened from any deck surface through
 * `useCardSheet().openCard(card)`.
 */
const CardSheet = ({ card, onClose }: { card: CardRef | null; onClose: () => void }) => (
  <Modal visible={card !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
        <View className="min-w-[72px]" />
        <Text className="font-display-bold text-[16px] text-ink-primary">Card</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClose}
          className="h-11 min-w-[72px] items-end justify-center"
        >
          <Text className="font-display text-[16px] text-accent">Done</Text>
        </TouchableOpacity>
      </View>
      {card && <CardDetails card={card} />}
    </View>
  </Modal>
);

const CardDetails = ({ card }: { card: CardRef }) => {
  const { width } = useWindowDimensions();
  const { match } = useCardMatch(card);
  const artWidth = Math.min(width - 32, 300);

  if (!match || match.kind === 'unknown') {
    return (
      <ScrollView contentContainerClassName="items-center gap-4 px-4 pb-10 pt-6">
        <CardArt card={card} variant="sheet" width={artWidth} />
        <Text className="text-center font-display-bold text-[22px] text-ink-primary">{card.name}</Text>
        <View className="flex-row items-center gap-2">
          <Icon name="alert-triangle" size={14} className="text-ink-secondary" />
          <Text className="text-[14px] text-ink-secondary">
            {match ? 'Not in the card catalog.' : "The card catalog hasn't loaded yet."}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const { card: info, printing } = match;
  const typeLine = [info.type, info.supertype, info.domains.join(', ')].filter(Boolean).join(' · ');
  const domains = info.domains.map(asDomain).filter((d): d is Domain => d !== null);
  const power = info.power ?? 0;
  const hasCost = info.energy !== null || power > 0;
  // Spoken: "Cost: 3 energy, 1 Calm or Chaos rune".
  const runeWords = domains.length > 0 ? domains.map(domainLabel).join(' or ') : 'any';
  const costLabel = [
    info.energy !== null ? `${info.energy} energy` : null,
    power > 0 ? `${power} ${runeWords} rune${power === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ScrollView contentContainerClassName="px-4 pb-10 pt-6">
      <View className="items-center">
        <CardArt card={card} variant="sheet" width={artWidth} />
      </View>
      <Text className="mt-5 font-display-bold text-[22px] leading-7 text-ink-primary">{info.name}</Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        <DomainIcons domains={info.domains} size={16} />
        <Text className="flex-1 font-display text-[14px] text-ink-secondary">{typeLine}</Text>
      </View>
      {(hasCost || info.might !== null) && (
        <View className="mt-4 flex-row gap-8">
          {hasCost && (
            <View accessible accessibilityLabel={`Cost: ${costLabel}`} className="items-start">
              <View className="h-7 flex-row items-center gap-1.5">
                {info.energy !== null && (
                  <Text className="font-display-bold text-[24px] text-ink-primary">{info.energy}</Text>
                )}
                {Array.from({ length: power }, (_, i) => (
                  <RuneIcon key={i} domains={domains} size={22} />
                ))}
              </View>
              <Text className="mt-0.5 text-[12px] text-ink-tertiary">Cost</Text>
            </View>
          )}
          {info.might !== null && (
            <View accessible accessibilityLabel={`Might: ${info.might}`} className="items-start">
              <View className="h-7 justify-center">
                <Text className="font-display-bold text-[24px] text-ink-primary">{info.might}</Text>
              </View>
              <Text className="mt-0.5 text-[12px] text-ink-tertiary">Might</Text>
            </View>
          )}
        </View>
      )}
      {match.kind === 'conflict' && (
        <View className="mt-3 flex-row items-start gap-2 rounded-xl bg-surface p-3">
          <Icon name="alert-triangle" size={14} className="mt-0.5 text-ink-primary" />
          <Text className="flex-1 text-[13px] leading-5 text-ink-primary">
            Listed as “{match.listedAs}”, but its code is this card.
          </Text>
        </View>
      )}
      <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <CardText text={info.current_text} />
      </View>
      {printing && (
        <View className="mt-3 flex-row items-center gap-1.5">
          <RarityIcon rarity={printing.rarity} size={14} />
          <Text className="flex-1 text-[12px] text-ink-tertiary">
            {[printing.code, printing.artist ? `Art: ${printing.artist}` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default CardSheet;
