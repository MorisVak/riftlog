import React from 'react';
import { Text, View } from 'react-native';
import type { DeckCardChange, DeckSection, DeckSectionDiff } from '@riftlog/core';

const SECTION_LABEL: Record<DeckSection, string> = {
  legend: 'Legend',
  champion: 'Chosen champion',
  main: 'Main deck',
  battlefields: 'Battlefields',
  runes: 'Runes',
  sideboard: 'Sideboard',
};

/**
 * "Before and after" of a deck edit: per section, each card whose count
 * changed between the version played (`before`) and the current list
 * (`after`). Built from core's `diffDeckLists`. Each row spells the change
 * out — counts, a +/− delta, and an "Added" / "Removed" label — so nothing
 * relies on color.
 */
const DeckDiff = ({ diff }: { diff: DeckSectionDiff[] }) => (
  <View className="rounded-2xl border border-border bg-surface px-4 pb-2 pt-3.5">
    <View className="mb-1 flex-row items-center justify-between">
      <Text className="font-display text-base text-ink-secondary">
        What changed since
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Text className="w-8 text-center font-display text-[11px] text-ink-tertiary">
          Then
        </Text>
        <View className="w-3" />
        <Text className="w-8 text-center font-display text-[11px] text-ink-tertiary">
          Now
        </Text>
      </View>
    </View>
    {diff.length === 0 ? (
      <Text className="pb-2 pt-1 text-[13px] text-ink-tertiary">
        No card changes — only the order differs.
      </Text>
    ) : (
      diff.map((s) => (
        <View key={s.section} className="mt-2">
          <Text className="mb-0.5 font-display text-[12px] text-ink-tertiary">
            {SECTION_LABEL[s.section]}
          </Text>
          {s.changes.map((c, i) => (
            <ChangeRow key={`${s.section}-${c.name}`} change={c} divider={i > 0} />
          ))}
        </View>
      ))
    )}
  </View>
);

const ChangeRow = ({
  change,
  divider,
}: {
  change: DeckCardChange;
  divider: boolean;
}) => {
  const { name, before, after } = change;
  const label =
    before === 0 ? 'Added' : after === 0 ? 'Removed' : null;
  const delta = after - before;
  const deltaText = delta > 0 ? `+${delta}` : `−${-delta}`;
  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${before} then, ${after} now${label ? `, ${label.toLowerCase()}` : ''}`}
      className={`flex-row items-center gap-2 py-2 ${divider ? 'border-t border-border/60' : ''}`}
    >
      <View className="flex-1 flex-row items-center gap-2">
        <Text
          className={`flex-shrink text-[14px] ${after === 0 ? 'text-ink-secondary line-through' : 'text-ink-primary'}`}
          numberOfLines={1}
        >
          {name}
        </Text>
        {label ? (
          <View className="rounded-full bg-elevated px-1.5 py-0.5">
            <Text className="font-display text-[10px] text-ink-secondary">
              {label}
            </Text>
          </View>
        ) : (
          <Text className="font-mono-medium text-[12px] text-ink-secondary">
            {deltaText}
          </Text>
        )}
      </View>
      <View className="flex-row items-center gap-1.5">
        <Text className="w-8 text-center font-mono-medium text-[14px] text-ink-secondary">
          {before === 0 ? '—' : before}
        </Text>
        <Text className="w-3 text-center text-[12px] text-ink-tertiary">→</Text>
        <Text className="w-8 text-center font-mono-medium text-[14px] text-ink-primary">
          {after === 0 ? '—' : after}
        </Text>
      </View>
    </View>
  );
};

export default DeckDiff;
