import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HistoryRowVM, Result } from '@/lib/historyView';

const TILE: Record<Result, { bg: string; text: string }> = {
  win: { bg: 'bg-win-tint', text: 'text-win-text' },
  loss: { bg: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bg: 'bg-draw-tint', text: 'text-draw-text' },
};

/** How many recent results the strip shows. */
const LAST_N = 10;

/**
 * "Last 10": your last ten results as W / L / D tiles, **newest on the
 * left** — read left to right, like the match list (letters, so color is
 * never the only signal) — each opening its match; with your record and win
 * rate overall. Your own matches only (Riot policy). Empty slots stay as
 * outlines until there are ten.
 */
const LastTenStrip = ({ vms, onOpen }: { vms: HistoryRowVM[]; onOpen: (id: string) => void }) => {
  const recent = vms.slice(0, LAST_N);
  const wins = vms.filter((v) => v.result === 'win').length;
  const losses = vms.filter((v) => v.result === 'loss').length;
  const decided = wins + losses;
  const rate = decided === 0 ? '–' : `${Math.round((wins / decided) * 100)}%`;
  const pad = Math.max(0, LAST_N - recent.length);

  return (
    <View className="rounded-2xl border border-border bg-surface px-4 py-3">
      <View
        accessible
        accessibilityLabel={`${wins} wins, ${losses} losses, ${rate} win rate overall.`}
        className="flex-row items-baseline justify-between"
      >
        <Text className="font-display text-[13px] text-ink-secondary">
          Last {LAST_N} <Text className="text-ink-tertiary">· newest first</Text>
        </Text>
        {/* Your record overall — said so, beside a "Last 10" label. */}
        <Text className="text-[13px] text-ink-secondary">
          <Text className="font-mono text-win-text">{wins}</Text>
          {'–'}
          <Text className="font-mono text-loss-text">{losses}</Text>
          {' · '}
          <Text className="font-mono text-accent">{rate}</Text>
          <Text className="text-ink-tertiary"> all time</Text>
        </Text>
      </View>
      <View className="mt-2 flex-row gap-1.5">
        {recent.map((v, i) => (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityLabel={`${i === 0 ? 'Latest match' : `Match ${i + 1} back`}: ${
              v.result === 'win' ? 'won' : v.result === 'loss' ? 'lost' : 'drawn'
            } ${v.score} against ${v.opponent}. Open match`}
            onPress={() => onOpen(v.id)}
            hitSlop={{ top: 6, bottom: 6 }}
            className={`h-8 flex-1 items-center justify-center rounded-md active:opacity-70 ${TILE[v.result].bg}`}
          >
            <Text className={`font-display-bold text-[12px] ${TILE[v.result].text}`}>
              {v.letter}
            </Text>
          </Pressable>
        ))}
        {Array.from({ length: pad }, (_, i) => (
          <View
            key={`pad-${i}`}
            className="h-8 flex-1 rounded-md border border-dashed border-border"
          />
        ))}
      </View>
    </View>
  );
};

export default LastTenStrip;
