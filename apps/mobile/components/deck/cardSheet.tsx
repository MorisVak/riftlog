import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { CardRef } from '@riftlog/core';
import Icon from '@/components/icon';
import RiotDisclaimer from '@/components/riotDisclaimer';
import CardArt from '@/components/deck/cardArt';
import CardText from '@/components/deck/cardText';
import { useCardMatch } from '@/hooks/useCardMatch';
import { CARD_ART } from '@/lib/featureFlags';

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
  const showsArt = CARD_ART && printing !== null && (printing.image_url !== null || printing.storage_path !== null);
  const typeLine = [info.type, info.supertype, info.domains.join(', ')].filter(Boolean).join(' · ');
  const stats = [
    info.energy !== null ? `Energy ${info.energy}` : null,
    info.might !== null ? `Might ${info.might}` : null,
    info.power !== null ? `Power ${info.power}` : null,
  ].filter(Boolean);

  return (
    <ScrollView contentContainerClassName="px-4 pb-10 pt-6">
      <View className="items-center">
        <CardArt card={card} variant="sheet" width={artWidth} />
        {showsArt && <RiotDisclaimer className="mt-2 text-center" />}
      </View>
      <Text className="mt-5 font-display-bold text-[22px] leading-7 text-ink-primary">{info.name}</Text>
      <Text className="mt-1 font-display text-[14px] text-ink-secondary">{typeLine}</Text>
      {stats.length > 0 && (
        <Text className="mt-1 font-mono-medium text-[13px] text-ink-secondary">{stats.join(' · ')}</Text>
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
        <Text className="mt-3 text-[12px] text-ink-tertiary">
          {[printing.code, printing.artist ? `Art: ${printing.artist}` : null].filter(Boolean).join(' · ')}
        </Text>
      )}
    </ScrollView>
  );
};

export default CardSheet;
