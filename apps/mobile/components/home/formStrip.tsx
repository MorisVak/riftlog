import React from 'react';
import { Text, View } from 'react-native';
import type { HistoryRowVM, Result } from '@/lib/historyView';

const TILE: Record<Result, { bg: string; text: string }> = {
  win: { bg: 'bg-win-tint', text: 'text-win-text' },
  loss: { bg: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bg: 'bg-draw-tint', text: 'text-draw-text' },
};

/** How many recent results the strip shows. */
const FORM_N = 10;

/**
 * Your form: the last ten results as W / L / D tiles, oldest left, newest
 * right (letters, so color is never the only signal), with your record and
 * win rate overall. Your own matches only (Riot policy). Empty slots stay as
 * outlines until there are ten.
 */
const FormStrip = ({ vms }: { vms: HistoryRowVM[] }) => {
  const recent = vms.slice(0, FORM_N).reverse();
  const wins = vms.filter((v) => v.result === 'win').length;
  const losses = vms.filter((v) => v.result === 'loss').length;
  const decided = wins + losses;
  const rate = decided === 0 ? '–' : `${Math.round((wins / decided) * 100)}%`;
  const pad = Math.max(0, FORM_N - recent.length);

  return (
    <View
      accessible
      accessibilityLabel={`Last ${recent.length} results: ${recent
        .map((v) => v.letter)
        .join(' ')}. ${wins} wins, ${losses} losses, ${rate} win rate.`}
      className="rounded-2xl border border-border bg-surface px-4 py-3"
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="font-display text-[13px] text-ink-secondary">Form</Text>
        <Text className="text-[13px] text-ink-secondary">
          <Text className="font-mono text-win-text">{wins}</Text>
          {' – '}
          <Text className="font-mono text-loss-text">{losses}</Text>
          {'  ·  '}
          <Text className="font-mono text-accent">{rate}</Text> win rate
        </Text>
      </View>
      <View className="mt-2 flex-row gap-1.5">
        {Array.from({ length: pad }, (_, i) => (
          <View key={`pad-${i}`} className="h-7 flex-1 rounded-md border border-dashed border-border" />
        ))}
        {recent.map((v) => (
          <View
            key={v.id}
            className={`h-7 flex-1 items-center justify-center rounded-md ${TILE[v.result].bg}`}
          >
            <Text className={`font-display-bold text-[12px] ${TILE[v.result].text}`}>{v.letter}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default FormStrip;
