import React from 'react';
import { Text, View } from 'react-native';
import {
  DECK_TARGETS,
  deckDomains,
  sectionTotals,
  type CardRef,
  type DeckList,
} from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';
import CardList from '@/components/deck/cardList';
import CardRow from '@/components/deck/cardRow';
import DeckSection from '@/components/deck/deckSection';
import { DomainChips, RuneBar, domainLabel } from '@/components/deck/domain';

/**
 * A decklist laid out like Piltover Archive's deck view:
 *   identity (legend + chosen champion, domains) → runes → battlefields →
 *   main deck (chosen champion first) → sideboard.
 *
 * Pure presentation of a DeckList; the detail screen and the import preview
 * both render through it so the two can't drift.
 */
const DeckView = ({
  name,
  list,
  title,
}: {
  name: string;
  list: DeckList;
  /** Replaces the name heading, e.g. with an editable one. */
  title?: React.ReactNode;
}) => {
  const totals = sectionTotals(list);
  const domains = deckDomains(list);

  return (
    <View>
      {title ?? (
        <Text className="font-display-bold text-[26px] tracking-tight text-ink-primary">
          {name}
        </Text>
      )}

      <View className="mt-4 flex-row gap-3">
        <IdentityCard label="Legend" card={list.legend} />
        <IdentityCard label="Chosen champion" card={list.champion} />
      </View>

      {domains && (
        <View className="mt-4">
          <DomainChips domains={domains} />
        </View>
      )}

      {/* Not in the game yet; only shown if an import actually had one. */}
      {list.additionalLegends.length > 0 && (
        <DeckSection
          title="Additional legends"
          count={list.additionalLegends.length}
        >
          <CardList cards={list.additionalLegends} />
        </DeckSection>
      )}

      <DeckSection title="Runes" count={totals.runes} target={DECK_TARGETS.runes}>
        {domains ? (
          <View className="gap-2.5 pb-3 pt-1.5">
            <Text className="font-mono-medium text-[14px] text-ink-primary">
              {domains
                .map((d) => `${d.count}× ${domainLabel(d.domain)}`)
                .join(' · ')}
            </Text>
            <RuneBar domains={domains} />
          </View>
        ) : (
          // Rune names that don't read as "<Domain> Rune": list them as-is
          // rather than guess at domains.
          <CardList cards={list.runes} />
        )}
      </DeckSection>

      <DeckSection
        title="Battlefields"
        count={totals.battlefields}
        target={DECK_TARGETS.battlefields}
      >
        <CardList cards={list.battlefields} />
      </DeckSection>

      <DeckSection title="Main deck" count={totals.main} target={DECK_TARGETS.main}>
        {list.champion && (
          <CardRow card={list.champion} tag="Chosen" divider={false} />
        )}
        <CardList cards={list.main} firstDivider={list.champion !== null} />
      </DeckSection>

      <DeckSection title="Sideboard" count={totals.sideboard}>
        <CardList cards={list.sideboard} />
      </DeckSection>
    </View>
  );
};

/**
 * Legend / chosen champion, side by side as the deck's identity. Riftbound
 * names read "Champion, Title", so the title drops to a second line.
 */
const IdentityCard = ({
  label,
  card,
}: {
  label: string;
  card: CardRef | null;
}) => {
  const [head, ...rest] = (card?.name ?? '').split(',');
  const title = rest.join(',').trim();

  return (
    <View className="flex-1 flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      {card ? (
        <CardArt card={card} variant="feature" />
      ) : (
        <View className="aspect-[63/88] w-[72px] rounded-lg border border-dashed border-border" />
      )}
      <View className="flex-1">
        <Text className="font-display text-[11px] uppercase tracking-wider text-ink-secondary">
          {label}
        </Text>
        {card ? (
          <>
            <Text
              className="mt-1 font-display-bold text-[15px] leading-5 text-ink-primary"
              numberOfLines={2}
            >
              {head?.trim()}
            </Text>
            {title !== '' && (
              <Text
                className="mt-0.5 text-[12px] leading-4 text-ink-secondary"
                numberOfLines={2}
              >
                {title}
              </Text>
            )}
          </>
        ) : (
          <Text className="mt-1 text-[13px] text-ink-tertiary">None</Text>
        )}
      </View>
    </View>
  );
};

export default DeckView;
