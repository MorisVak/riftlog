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
 * "Last 10": your last ten results as W / L / D tiles, newest on the left
 * (read left to right, like the match list; letters, so color is never the
 * only signal), each opening its match, with the record of those ten. Your
 * own matches only (Riot policy). Empty slots stay as outlines until there
 * are ten.
 */
const LastTenStrip = ({
  vms,
  onOpen,
  bare = false,
}: {
  vms: HistoryRowVM[];
  onOpen: (id: string) => void;
  /** Inside a card that brings its own border (Home's matches card). */
  bare?: boolean;
}) => {
  const recent = vms.slice(0, LAST_N);
  // The record of these ten — what the tiles show. (All-time stats belong to
  // the stats section that comes later.)
  const wins = recent.filter((v) => v.result === 'win').length;
  const losses = recent.filter((v) => v.result === 'loss').length;
  const draws = recent.length - wins - losses;
  const pad = Math.max(0, LAST_N - recent.length);

  return (
    <View className={bare ? 'px-1' : 'rounded-2xl border border-border bg-surface px-4 py-3'}>
      <View
        accessible
        accessibilityLabel={`Last ${recent.length}: ${wins} wins, ${losses} losses${
          draws > 0 ? `, ${draws} draws` : ''
        }.`}
        className="flex-row items-baseline justify-between"
      >
        <Text className="font-display text-[13px] text-ink-secondary">Last {LAST_N}</Text>
        <Text className="font-mono text-[13px] text-ink-secondary">
          <Text className="text-win-text">{wins}</Text>
          {'–'}
          <Text className="text-loss-text">{losses}</Text>
          {draws > 0 && (
            <>
              {'–'}
              <Text className="text-draw-text">{draws}</Text>
            </>
          )}
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
