import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HistoryRowVM, Result } from '@/lib/historyView';
import { LegendPortrait } from '@/components/deck/cardArt';
import MatchMeta from '@/components/matchMeta';
import Icon from '@/components/icon';

// Result tokens: the left bar and the letter badge, so color is never the
// only signal (colorblind-safe rule), and the score in the result color.
const RESULT: Record<Result, { bar: string; badge: string; text: string }> = {
  win: { bar: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { bar: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { bar: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
};

/** A line's height, hairline included — Home counts how many fit. */
export const MATCH_LINE_H = 56;

/**
 * One match as a line in Home's matches card: result bar + letter, the face
 * of *their* legend (yours is already on the hero), "vs" their name, format
 * and deck, then the score in the result color and the date. No backdrop
 * art — a list of art rows repeated your legend line after line. Tap to
 * open the match.
 */
const MatchLine = ({ vm, onPress }: { vm: HistoryRowVM; onPress: () => void }) => {
  const r = RESULT[vm.result];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vm.result === 'win' ? 'Won' : vm.result === 'loss' ? 'Lost' : 'Drew'} ${
        vm.score
      } against ${vm.opponent}, ${vm.date}. Open match`}
      onPress={onPress}
      style={{ height: MATCH_LINE_H }}
      className="flex-row items-center border-t border-border/60 active:bg-elevated"
    >
      <View className={`w-[3px] self-stretch ${r.bar}`} />
      <View className={`ml-3 h-7 w-7 items-center justify-center rounded-md ${r.badge}`}>
        <Text className={`font-display-bold text-[12px] ${r.text}`}>{vm.letter}</Text>
      </View>
      <View className="ml-3 h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-elevated">
        {vm.opponentLegend ? (
          <LegendPortrait card={vm.opponentLegend} />
        ) : (
          <Icon name="user" size={14} className="text-ink-tertiary" />
        )}
      </View>
      <View className="ml-2.5 flex-1">
        <Text className="font-display text-[15px] font-semibold text-ink-primary" numberOfLines={1}>
          <Text className="font-normal text-ink-secondary">vs </Text>
          {vm.opponent}
        </Text>
        <MatchMeta vm={vm} />
      </View>
      <View className="mr-3.5 items-end">
        <Text className={`font-mono text-[15px] ${r.text}`}>{vm.score}</Text>
        <Text className="mt-0.5 text-[11px] text-ink-secondary">{vm.date}</Text>
      </View>
    </Pressable>
  );
};

export default MatchLine;
