import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CardIssue, CardMatch, CardRef, ListSection } from '@riftlog/core';
import CardArt from '@/components/deck/cardArt';
import Icon from '@/components/icon';
import { useCardSheet } from '@/contexts/cardSheetContext';
import { useCardMatch } from '@/hooks/useCardMatch';

/** How this card's count moved from the version before (Show changes). */
export type CardChange = { before: number; after: number };

type CardRowProps = {
  card: CardRef;
  /** The chosen champion: gold frame on the art and a "Chosen champion" chip. */
  chosen?: boolean;
  /** Hairline above the row; off for the first row of a section. */
  divider?: boolean;
  /**
   * Set in "Show changes" mode when the count differs from the previous
   * version: green for added / increased, red for cut / reduced. A removed
   * card is passed with its old count and `after: 0`, and is struck through.
   */
  change?: CardChange;
  /** The section the card sits in, to flag a card of the wrong type. */
  section?: ListSection;
};

/** "Unit · Fury" for a matched card. */
const typeLine = (match: CardMatch | null): string | null =>
  match && match.kind !== 'unknown'
    ? [match.card.type, ...match.card.domains].join(' · ')
    : null;

/** The flag on a problem card, in words (never an icon or color alone). */
export const issueLabel = (issue: CardIssue): string =>
  issue.kind === 'unknown'
    ? 'Not in the card catalog'
    : issue.kind === 'conflict'
      ? `Code is ${issue.cardName}`
      : `${issue.type} in this section`;

/** "+2" / "−1" / "New" / "Removed" — the change in words, never color alone. */
const changeLabel = ({ before, after }: CardChange): string =>
  before === 0
    ? 'New'
    : after === 0
      ? 'Removed'
      : after > before
        ? `+${after - before}`
        : `−${before - after}`;

/**
 * One card in a decklist: count badge + name, with its type and any problem
 * (not in the catalog, wrong section) on a second line. Tapping it opens the
 * card sheet. Every deck surface renders cards through this (and it through
 * `CardArt`), so art arrives in one place.
 */
const CardRow = ({ card, chosen = false, divider = true, change, section }: CardRowProps) => {
  const up = change !== undefined && change.after > change.before;
  const removed = change !== undefined && change.after === 0;
  const { match, issue } = useCardMatch(card, section);
  const { openCard } = useCardSheet();
  const subline = issue ? issueLabel(issue) : typeLine(match);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Shows the card's details"
      onPress={() => openCard(card)}
      accessibilityLabel={`${card.count} ${card.name}${chosen ? ', chosen champion' : ''}${
        change
          ? removed
            ? `, removed (was ${change.before})`
            : `, ${changeLabel(change).replace('−', 'minus ')}`
          : ''
      }${subline ? `, ${subline}` : ''}`}
      // A changed row is an inset pill in its change color — rounded and
      // inside the section's padding, so it never meets the card's own rounded
      // edges; it drops the hairline (the pill separates itself).
      className={`flex-row items-center gap-3 py-2.5 active:opacity-70 ${
        change
          ? `-mx-2 my-0.5 rounded-lg px-2 ${up ? 'bg-added-tint' : 'bg-cut-tint'}`
          : divider
            ? 'border-t border-border/60'
            : ''
      }`}
    >
      <View
        className={`h-6 min-w-[28px] items-center justify-center rounded-md px-1.5 ${
          change ? 'bg-background/50' : 'bg-elevated'
        }`}
      >
        <Text
          className={`font-mono-medium text-[13px] ${
            change ? (up ? 'text-added' : 'text-cut') : 'text-ink-primary'
          } ${removed ? 'line-through' : ''}`}
        >
          {card.count}
        </Text>
      </View>
      <CardArt card={card} variant="thumb" chosen={chosen} />
      <View className="flex-1">
        <Text
          className={`text-[15px] ${
            removed ? 'text-ink-secondary line-through' : 'text-ink-primary'
          }`}
          numberOfLines={2}
        >
          {card.name}
        </Text>
        {subline && (
          <View className="mt-0.5 flex-row items-center gap-1">
            {issue && <Icon name="alert-triangle" size={11} className="text-ink-primary" />}
            <Text
              className={`text-[12px] ${issue ? 'text-ink-primary' : 'text-ink-tertiary'}`}
              numberOfLines={1}
            >
              {subline}
            </Text>
          </View>
        )}
      </View>
      {chosen ? (
        <View className="rounded-full bg-chosen-tint px-2 py-0.5">
          {/* Spelled out: "Chosen" alone didn't say chosen *what*. */}
          <Text className="font-display text-[11px] text-chosen" numberOfLines={1}>
            Chosen champion
          </Text>
        </View>
      ) : null}
      {change ? (
        <Text
          className={`font-mono-medium text-[12px] ${up ? 'text-added' : 'text-cut'}`}
        >
          {changeLabel(change)}
        </Text>
      ) : null}
    </Pressable>
  );
};

export default CardRow;
