import React from 'react';
import { Text, View } from 'react-native';
import {
  DECK_TARGETS,
  sectionTotals,
  type DeckDiagnostic,
  type DeckSection as Section,
  type ParsedDeck,
} from '@riftlog/core';
import CardList from '@/components/deck/cardList';
import CardRow from '@/components/deck/cardRow';
import DeckSection from '@/components/deck/deckSection';
import Icon from '@/components/icon';

/**
 * Live preview of a pasted decklist: every section with its total, the parsed
 * cards, and each diagnostic shown inside the section it concerns — line
 * problems quote the line they came from; deck-level count warnings sit under
 * that section's total. Lines that belong to no section (before any header, or
 * under an unknown one) are grouped first, since they're the likeliest cause
 * of everything else looking wrong.
 *
 * Cards render through CardRow, the same as the saved deck's detail screen.
 */
const ImportPreview = ({
  parsed,
  sourceLines,
}: {
  parsed: ParsedDeck;
  /** The pasted text split into lines, so issues can quote their line. */
  sourceLines: string[];
}) => {
  const { list, diagnostics } = parsed;
  const totals = sectionTotals(list);
  const issuesFor = (section: Section | null) =>
    diagnostics.filter((d) => d.section === section);

  const orphanIssues = issuesFor(null);

  return (
    <View>
      {orphanIssues.length > 0 && (
        <View className="mt-4 rounded-2xl border border-loss/60 bg-surface px-4 py-3">
          <Text className="mb-1 font-display text-xs uppercase tracking-wider text-ink-secondary">
            Not in a section
          </Text>
          <Issues issues={orphanIssues} sourceLines={sourceLines} />
        </View>
      )}

      <DeckSection title="Legend" count={list.legend ? 1 : 0} target={1}>
        <Issues issues={issuesFor('legend')} sourceLines={sourceLines} />
        <CardList
          cards={[
            ...(list.legend ? [list.legend] : []),
            ...list.additionalLegends,
          ]}
        />
      </DeckSection>

      <DeckSection title="Chosen champion" count={list.champion ? 1 : 0} target={1}>
        <Issues issues={issuesFor('champion')} sourceLines={sourceLines} />
        <CardList cards={list.champion ? [list.champion] : []} />
      </DeckSection>

      <DeckSection title="Runes" count={totals.runes} target={DECK_TARGETS.runes}>
        <Issues issues={issuesFor('runes')} sourceLines={sourceLines} />
        <CardList cards={list.runes} />
      </DeckSection>

      <DeckSection
        title="Battlefields"
        count={totals.battlefields}
        target={DECK_TARGETS.battlefields}
      >
        <Issues issues={issuesFor('battlefields')} sourceLines={sourceLines} />
        <CardList cards={list.battlefields} />
      </DeckSection>

      <DeckSection title="Main deck" count={totals.main} target={DECK_TARGETS.main}>
        <Issues issues={issuesFor('main')} sourceLines={sourceLines} />
        {list.champion && (
          <CardRow card={list.champion} tag="Chosen" divider={false} />
        )}
        <CardList cards={list.main} firstDivider={list.champion !== null} />
      </DeckSection>

      <DeckSection title="Sideboard" count={totals.sideboard}>
        <Issues issues={issuesFor('sideboard')} sourceLines={sourceLines} />
        <CardList cards={list.sideboard} />
      </DeckSection>
    </View>
  );
};

/**
 * Diagnostics for one section. Errors (the line was dropped) and warnings (kept
 * as written) differ in icon AND wording AND color — never color alone.
 */
const Issues = ({
  issues,
  sourceLines,
}: {
  issues: DeckDiagnostic[];
  sourceLines: string[];
}) => {
  if (issues.length === 0) return null;
  // Line issues in paste order, then deck-level checks.
  const sorted = [...issues].sort(
    (a, b) => (a.line ?? Infinity) - (b.line ?? Infinity),
  );
  return (
    <View className="gap-2 pb-2.5 pt-1">
      {sorted.map((d, i) => {
        const isError = d.severity === 'error';
        const quoted = d.line !== null ? sourceLines[d.line - 1]?.trim() : null;
        return (
          <View
            key={`${d.code}-${d.line ?? 'deck'}-${i}`}
            accessible
            accessibilityLabel={`${isError ? 'Error' : 'Warning'}${d.line !== null ? `, line ${d.line}` : ''}: ${d.message}`}
            className="flex-row gap-2"
          >
            <Icon
              name={isError ? 'x-circle' : 'alert-circle'}
              size={14}
              className={`mt-0.5 ${isError ? 'text-loss-text' : 'text-ink-secondary'}`}
            />
            <View className="flex-1">
              {quoted ? (
                <Text
                  className="font-mono-medium text-[12px] text-ink-tertiary"
                  numberOfLines={1}
                >
                  Line {d.line} · {quoted}
                </Text>
              ) : null}
              <Text
                className={`text-[13px] leading-[18px] ${isError ? 'text-loss-text' : 'text-ink-secondary'}`}
              >
                {/* unknown_section already says its cards were skipped. */}
                {isError && d.code !== 'unknown_section' ? 'Skipped: ' : ''}
                {d.message}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default ImportPreview;
