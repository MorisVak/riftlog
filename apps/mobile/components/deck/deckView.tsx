import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from '@/components/icon';
import {
  DECK_TARGETS,
  deckDomains,
  sectionTotals,
  type CardRef,
  type DeckCardChange,
  type DeckList,
  type DeckSection as SectionName,
  type DeckSectionDiff,
} from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';
import CardGrid from '@/components/deck/cardGrid';
import CardList from '@/components/deck/cardList';
import CardRow from '@/components/deck/cardRow';
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
  list,
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
  // One section's cards in the current layout.
  const cardsOf = (
    cards: CardRef[],
    sectionChanges: DeckCardChange[] | undefined,
  ) =>
    gallery ? (
      <CardGrid cards={cards} changes={sectionChanges} />
    ) : (
      <CardList cards={cards} changes={sectionChanges} />
    );
  const totals = sectionTotals(list);
  const domains = deckDomains(list);
  // undefined (no annotation) unless Show changes is on.
  const changesFor = (s: SectionName): DeckCardChange[] | undefined =>
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
        <IdentityCard label="Legend" card={list.legend} isNew={legendChanged} />
        <IdentityCard label="Chosen champion" card={list.champion} />
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
          <CardList cards={list.additionalLegends} />
        </DeckSection>
      )}

      <DeckSection
        title="Runes"
        count={totals.runes}
        target={DECK_TARGETS.runes}
      >
        {changes || gallery ? (
          cardsOf(list.runes, changesFor('runes'))
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
          <CardList cards={list.runes} />
        )}
      </DeckSection>

      <DeckSection
        title="Battlefields"
        count={totals.battlefields}
        target={DECK_TARGETS.battlefields}
      >
        {cardsOf(list.battlefields, changesFor('battlefields'))}
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
            lead={[
              ...(list.champion
                ? [
                    {
                      card: list.champion,
                      tag: 'Chosen',
                      change: championChange,
                    },
                  ]
                : []),
              ...(championChanges ?? [])
                .filter((c) => c.after === 0)
                .map((c) => ({
                  card: { name: c.name, code: null, count: c.before },
                  tag: 'Chosen',
                  change: c,
                })),
            ]}
          />
        ) : (
          <>
            {list.champion && (
              <CardRow
                card={list.champion}
                tag="Chosen"
                divider={false}
                change={championChange}
              />
            )}
            {/* A swapped-out chosen champion, struck through. */}
            {championChanges
              ?.filter((c) => c.after === 0)
              .map((c) => (
                <CardRow
                  key={`champion-${c.name}`}
                  card={{ name: c.name, code: null, count: c.before }}
                  tag="Chosen"
                  change={c}
                />
              ))}
            <CardList
              cards={list.main}
              firstDivider={list.champion !== null}
              changes={changesFor('main')}
            />
          </>
        )}
      </DeckSection>

      <DeckSection title="Sideboard" count={totals.sideboard}>
        {cardsOf(list.sideboard, changesFor('sideboard'))}
      </DeckSection>
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
}: {
  label: string;
  card: CardRef | null;
  /** Show changes: this card replaced the previous version's. */
  isNew?: boolean;
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
      </View>
    </View>
  );
};

export default DeckView;
