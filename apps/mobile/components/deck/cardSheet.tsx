import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  legendArtPrinting,
  NO_LEGEND_ART,
  type CardRef,
  type CatalogCard,
  type CatalogPrinting,
  type Domain,
} from '@riftlog/core';
import Icon from '@/components/icon';
import CardArt from '@/components/deck/cardArt';
import CardText, { MightIcon } from '@/components/deck/cardText';
import { DomainChip, RuneIcon, asDomain, domainLabel } from '@/components/deck/domain';
import RarityIcon from '@/components/deck/rarity';
import { useCatalog } from '@/contexts/catalogContext';
import { useCardMatch } from '@/hooks/useCardMatch';
import { useProfile } from '@/contexts/profileContext';

/**
 * A card's details as a popup over the current screen: art, name, chips
 * (type, rarity, domains, tags), a stat row, the rules text and the
 * printing's details. Opened from any deck surface through
 * `useCardSheet().openCard(card)`; closes on ✕ or a tap outside.
 */
const CardSheet = ({ card, onClose }: { card: CardRef | null; onClose: () => void }) => {
  const { width, height } = useWindowDimensions();
  const popupWidth = Math.min(width - 32, 420);
  return (
    <Modal
      visible={card !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close card"
          onPress={onClose}
          className="absolute inset-0 bg-background/80"
        />
        <View
          style={{ width: popupWidth, maxHeight: height * 0.86 }}
          className="overflow-hidden rounded-3xl border border-border bg-elevated"
        >
          {card && <CardDetails card={card} artWidth={popupWidth - 48} />}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-background/70"
          >
            <Icon name="x" size={18} className="text-ink-primary" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const Chip = ({ children, a11y }: { children: React.ReactNode; a11y?: string }) => (
  <View
    accessible={a11y !== undefined}
    accessibilityLabel={a11y}
    className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1"
  >
    {children}
  </View>
);

const ChipText = ({ children }: { children: React.ReactNode }) => (
  <Text className="font-display text-[13px] text-ink-primary">{children}</Text>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <Text className="mb-2 font-display text-base text-ink-secondary">{children}</Text>
);

const Stat = ({ label, a11y, children }: { label: string; a11y: string; children: React.ReactNode }) => (
  <View accessible accessibilityLabel={a11y} className="flex-1 items-center">
    <Text className="text-[13px] text-ink-secondary">{label}</Text>
    {/* At least, not exactly, h-9: the 30pt numeral is taller than that
        (h-9 is 31.5pt on native) and Android clips what spills over. */}
    <View className="mt-1 min-h-9 flex-row items-center justify-center gap-1">{children}</View>
  </View>
);

const StatNumber = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <Text className={`font-display-bold text-[30px] ${muted ? 'text-ink-tertiary' : 'text-ink-primary'}`}>
    {children}
  </Text>
);

const CardDetails = ({ card, artWidth }: { card: CardRef; artWidth: number }) => {
  const { match } = useCardMatch(card);
  const { index } = useCatalog();
  const { profile } = useProfile();
  const pref = profile?.legendArt ?? NO_LEGEND_ART;

  if (!match || match.kind === 'unknown') {
    return (
      <ScrollView contentContainerClassName="items-center gap-4 px-6 pb-8 pt-6">
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

  const { card: info } = match;
  // The art you see in the decklist, so tapping a legend doesn't jump back to
  // the standard art: with "Use in decklists" on, the legend-art preference
  // picks the printing here too — its art and its number, set and artist.
  const printing =
    pref.decklists && index
      ? legendArtPrinting(info, match.printing, pref, index)
      : match.printing;
  const shown: CardRef = printing ? { ...card, code: printing.code } : card;
  const domains = info.domains.map(asDomain).filter((d): d is Domain => d !== null);

  return (
    <ScrollView contentContainerClassName="px-6 pb-8 pt-6">
      <View className="items-center">
        <CardArt card={shown} variant="sheet" width={artWidth} asPrinted />
      </View>
      <Text className="mt-5 text-center font-display-bold text-[22px] leading-7 text-ink-primary">
        {info.name}
      </Text>

      <View className="mt-4 flex-row flex-wrap justify-center gap-2">
        <Chip>
          <ChipText>{[info.supertype, info.type].filter(Boolean).join(' ')}</ChipText>
        </Chip>
        {printing?.rarity && (
          <Chip a11y={`Rarity: ${printing.rarity}`}>
            <RarityIcon rarity={printing.rarity} size={14} />
            <ChipText>{printing.rarity}</ChipText>
          </Chip>
        )}
        {domains.map((d) => (
          <DomainChip key={d} domain={d} />
        ))}
      </View>
      {info.tags.length > 0 && (
        <View className="mt-2 flex-row flex-wrap justify-center gap-2">
          {info.tags.map((t) => (
            <View key={t} className="rounded-md border border-border px-2 py-0.5">
              <Text className="text-[12px] text-ink-secondary">{t}</Text>
            </View>
          ))}
        </View>
      )}

      <Stats info={info} domains={domains} />

      {match.kind === 'conflict' && (
        <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-surface p-3">
          <Icon name="alert-triangle" size={14} className="mt-0.5 text-ink-primary" />
          <Text className="flex-1 text-[13px] leading-5 text-ink-primary">
            Listed as “{match.listedAs}”, but its code is this card.
          </Text>
        </View>
      )}

      {info.current_text !== '' && (
        <View className="mt-5">
          <Heading>Card text</Heading>
          <CardText text={info.current_text} />
        </View>
      )}

      {printing && <PrintingInfo printing={printing} />}
    </ScrollView>
  );
};

/**
 * Energy · Power · Might, as on Piltover Archive. Power shows one rune per
 * point (dual for two-domain cards, rainbow with no domain). A gear's might
 * is the bonus it gives, so it reads "+3".
 */
const Stats = ({ info, domains }: { info: CatalogCard; domains: Domain[] }) => {
  const hasCost = info.energy !== null;
  const power = info.power ?? 0;
  if (!hasCost && info.might === null) return null;
  const runeWords = domains.length > 0 ? domains.map(domainLabel).join(' or ') : 'any';
  const isGear = info.type === 'Gear';
  return (
    <View className="mt-5 flex-row rounded-2xl bg-surface px-2 py-3">
      {hasCost && (
        <Stat label="Energy" a11y={`Energy: ${info.energy}`}>
          <StatNumber>{info.energy}</StatNumber>
        </Stat>
      )}
      {hasCost && (
        <Stat
          label="Power"
          a11y={power > 0 ? `Power: ${power} ${runeWords} rune${power === 1 ? '' : 's'}` : 'Power: 0'}
        >
          {power > 0 ? (
            Array.from({ length: power }, (_, i) => <RuneIcon key={i} domains={domains} size={26} />)
          ) : (
            <StatNumber muted>0</StatNumber>
          )}
        </Stat>
      )}
      {info.might !== null && (
        <Stat
          label="Might"
          a11y={isGear ? `Might bonus: plus ${info.might}` : `Might: ${info.might}`}
        >
          <StatNumber>{isGear ? `+${info.might}` : info.might}</StatNumber>
          {/* A digit sits low in its line box; drop the glyph to match it. */}
          <View style={{ transform: [{ translateY: 4 }] }}>
            <MightIcon size={22} />
          </View>
        </Stat>
      )}
    </View>
  );
};

const PrintingInfo = ({ printing }: { printing: CatalogPrinting }) => {
  const { index } = useCatalog();
  const set = index?.setByCode.get(printing.set_code);
  const variant = [
    printing.alt_art && 'Alternate art',
    printing.overnumbered && 'Overnumbered',
    printing.signed && 'Signed',
    printing.promo && 'Promo',
  ].filter(Boolean);
  const rows: [string, string][] = [
    ['Card number', printing.code],
    ['Set', set ? set.name : printing.set_code],
    ...(variant.length > 0 ? [['Printing', variant.join(', ')] as [string, string]] : []),
    ...(printing.artist ? [['Artist', printing.artist] as [string, string]] : []),
  ];
  return (
    <View className="mt-6 rounded-2xl bg-surface p-4">
      <Heading>Card information</Heading>
      <View className="gap-1.5">
        {rows.map(([label, value]) => (
          <View key={label} className="flex-row gap-2">
            <Text className="w-[96px] text-[13px] text-ink-tertiary">{label}</Text>
            <Text className="flex-1 text-[13px] text-ink-primary">{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CardSheet;
