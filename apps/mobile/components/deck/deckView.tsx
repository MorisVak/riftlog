import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from '@/components/icon';
import {
  DECK_TARGETS,
  deckDomains,
  resortUnsorted,
  sectionTotals,
  splitCardName,
  type CardRef,
  type DeckCardChange,
  type DeckList,
  type DeckSection as SectionName,
  type DeckSectionDiff,
  type ListSection,
} from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';
import DeckCheckNote from '@/components/deck/deckCheckNote';
import { useCardSheet } from '@/contexts/cardSheetContext';
import { useCatalog } from '@/contexts/catalogContext';
import { useCardMatch } from '@/hooks/useCardMatch';
import CardGrid from '@/components/deck/cardGrid';
import CardList from '@/components/deck/cardList';
import CardRow, { issueLabel } from '@/components/deck/cardRow';
import DeckSection from '@/components/deck/deckSection';
import { DomainChips, RuneBar, domainLabel } from '@/components/deck/domain';

/** How a decklist's sections are drawn. */
export type DeckLayout = 'list' | 'gallery';

/**
 * A decklist laid out like Piltover Archive's deck view:
 *   identity (legend + chosen champion, domains) → runes → battlefields →
 *   main deck (chosen champion first) → sideboard.
 *
 * Pure presentation of a DeckList; the detail screen and the import preview
 * both render through it so the two can't drift.
 *
 * `changes` (Show changes mode) is `diffDeckLists(previous, list)`: each
 * section marks its changed cards green / red and lists cut cards struck
 * through; runes then show as rows so their changes are visible too.
 */
const DeckView = ({
  name,
  list: storedList,
  title,
  changes = null,
  layout = 'list',
  onLayoutChange,
}: {
  name: string;
  list: DeckList;
  /** Replaces the name heading, e.g. with an editable one. */
  title?: React.ReactNode;
  changes?: DeckSectionDiff[] | null;
  /** Rows (`list`) or a grid of card tiles (`gallery`). */
  layout?: DeckLayout;
  /** When set, a List / Gallery switch is shown under the domain chips. */
  onLayoutChange?: (layout: DeckLayout) => void;
}) => {
  const gallery = layout === 'gallery';
  // Unsorted cards (deck-code printings the catalog didn't know) move into
  // their section on screen once it does; the stored list is unchanged.
  const { index } = useCatalog();
  const list = useMemo(
    () => (index ? resortUnsorted(storedList, index) : storedList),
    [index, storedList],
  );
  // One section's cards in the current layout.
  const cardsOf = (
    cards: CardRef[],
    sectionChanges: DeckCardChange[] | undefined,
    section: ListSection,
  ) =>
    gallery ? (
      <CardGrid cards={cards} changes={sectionChanges} section={section} />
    ) : (
      <CardList cards={cards} changes={sectionChanges} section={section} />
    );
  const totals = sectionTotals(list);
  const domains = deckDomains(list);
  // undefined (no annotation) unless Show changes is on.
  const changesFor = (s: SectionName | 'unsorted'): DeckCardChange[] | undefined =>
    changes ? (changes.find((d) => d.section === s)?.changes ?? []) : undefined;
  const legendChanged = (changesFor('legend') ?? []).some(
    (c) => c.before === 0,
  );
  const championChanges = changesFor('champion');
  const championChange = list.champion
    ? championChanges?.find((c) => c.name === list.champion?.name)
    : undefined;

  return (
    <View>
      {title ?? (
        <Text className="font-display-bold text-[26px] tracking-tight text-ink-primary">
          {name}
        </Text>
      )}

      <View className="mt-4 flex-row gap-3">
        <IdentityCard label="Legend" card={list.legend} isNew={legendChanged} section="legend" />
        <IdentityCard label="Chosen champion" card={list.champion} section="champion" />
      </View>

      {(domains || onLayoutChange) && (
        <View className="mt-4 flex-row items-center gap-3">
          <View className="flex-1">
            {domains && <DomainChips domains={domains} />}
          </View>
          {onLayoutChange && (
            <LayoutSwitch value={layout} onChange={onLayoutChange} />
          )}
        </View>
      )}

      {/* Not in the game yet; only shown if an import actually had one. */}
      {list.additionalLegends.length > 0 && (
        <DeckSection
          title="Additional legends"
          count={list.additionalLegends.length}
        >
          <CardList cards={list.additionalLegends} section="additionalLegends" />
        </DeckSection>
      )}

      <DeckSection
        title="Runes"
        count={totals.runes}
        target={DECK_TARGETS.runes}
      >
        {changes || gallery ? (
          cardsOf(list.runes, changesFor('runes'), 'runes')
        ) : domains ? (
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
          <CardList cards={list.runes} section="runes" />
        )}
      </DeckSection>

      <DeckSection
        title="Battlefields"
        count={totals.battlefields}
        target={DECK_TARGETS.battlefields}
      >
        {cardsOf(list.battlefields, changesFor('battlefields'), 'battlefields')}
      </DeckSection>

      <DeckSection
        title="Main deck"
        count={totals.main}
        target={DECK_TARGETS.main}
      >
        {gallery ? (
          <CardGrid
            cards={list.main}
            changes={changesFor('main')}
            section="main"
            lead={[
              ...(list.champion
                ? [
                    {
                      card: list.champion,
                      chosen: true,
                      change: championChange,
                    },
                  ]
                : []),
              ...(championChanges ?? [])
                .filter((c) => c.after === 0)
                .map((c) => ({
                  card: { name: c.name, code: null, count: c.before },
                  chosen: true,
                  change: c,
                })),
            ]}
          />
        ) : (
          <>
            {list.champion && (
              <CardRow
                card={list.champion}
                chosen
                divider={false}
                change={championChange}
                section="champion"
              />
            )}
            {/* A swapped-out chosen champion, struck through. */}
            {championChanges
              ?.filter((c) => c.after === 0)
              .map((c) => (
                <CardRow
                  key={`champion-${c.name}`}
                  card={{ name: c.name, code: null, count: c.before }}
                  chosen
                  change={c}
                />
              ))}
            <CardList
              cards={list.main}
              firstDivider={list.champion !== null}
              changes={changesFor('main')}
              section="main"
            />
          </>
        )}
      </DeckSection>

      <DeckSection title="Sideboard" count={totals.sideboard}>
        {cardsOf(list.sideboard, changesFor('sideboard'), 'sideboard')}
      </DeckSection>

      {/* Deck-code printings the catalog doesn't know yet (e.g. a new set). */}
      {(list.unsorted?.length ?? 0) > 0 && (
        <DeckSection
          title="Unsorted"
          count={(list.unsorted ?? []).reduce((n, c) => n + c.count, 0)}
        >
          <Text className="pb-1.5 text-[12px] leading-4 text-ink-tertiary">
            Riftlog doesn&apos;t know these cards yet. They move to their
            section once it does.
          </Text>
          {cardsOf(list.unsorted ?? [], changesFor('unsorted'), 'unsorted')}
        </DeckSection>
      )}

      <DeckCheckNote list={list} />
    </View>
  );
};

/** List / Gallery: two icon buttons as one segmented control. */
const LayoutSwitch = ({
  value,
  onChange,
}: {
  value: DeckLayout;
  onChange: (layout: DeckLayout) => void;
}) => (
  <View className="flex-row rounded-xl border border-border bg-surface p-0.5">
    {(
      [
        { key: 'list', icon: 'list', label: 'List view' },
        { key: 'gallery', icon: 'grid', label: 'Gallery view' },
      ] as const
    ).map((o) => {
      const on = value === o.key;
      return (
        <Pressable
          key={o.key}
          accessibilityRole="button"
          accessibilityLabel={o.label}
          accessibilityState={{ selected: on }}
          onPress={() => {
            if (on) return;
            Haptics.selectionAsync();
            onChange(o.key);
          }}
          hitSlop={4}
          className={`h-9 w-11 items-center justify-center rounded-[10px] ${
            on ? 'bg-accent/20' : 'active:bg-elevated'
          }`}
        >
          <Icon
            name={o.icon}
            size={17}
            className={on ? 'text-accent' : 'text-ink-tertiary'}
          />
        </Pressable>
      );
    })}
  </View>
);

/**
 * Legend / chosen champion, side by side as the deck's identity. Riftbound
 * names read "Champion, Title", so the title drops to a second line.
 */
const IdentityCard = ({
  label,
  card,
  isNew = false,
  section,
}: {
  label: string;
  card: CardRef | null;
  /** Show changes: this card replaced the previous version's. */
  isNew?: boolean;
  section: SectionName;
}) => {
  const { head, title } = splitCardName(card?.name ?? '');
  const { issue } = useCardMatch(card ?? { name: '', code: null }, card ? section : undefined);
  const { openCard } = useCardSheet();

  return (
    <Pressable
      disabled={!card}
      onPress={() => card && openCard(card)}
      accessibilityRole={card ? 'button' : undefined}
      accessibilityLabel={
        card ? `${label}: ${card.name}${issue ? `, ${issueLabel(issue)}` : ''}` : `${label}: none`
      }
      accessibilityHint={card ? "Shows the card's details" : undefined}
      className="flex-1 flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 active:opacity-70"
    >
      {card ? (
        <CardArt card={card} variant="feature" />
      ) : (
        <View className="aspect-[63/88] w-[72px] rounded-lg border border-dashed border-border" />
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-display text-[13px] text-ink-secondary">
            {label}
          </Text>
          {isNew && (
            <Text className="font-mono-medium text-[11px] text-added">New</Text>
          )}
        </View>
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
        {issue && (
          <View className="mt-1 flex-row items-center gap-1">
            <Icon name="alert-triangle" size={11} className="text-ink-primary" />
            <Text className="text-[11px] text-ink-primary" numberOfLines={2}>
              {issueLabel(issue)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default DeckView;
