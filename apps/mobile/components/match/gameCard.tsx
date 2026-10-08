import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { DetailGameVM } from '@/lib/matchDetailView';
import Icon from '@/components/icon';
import ScoreGraph from '@/components/match/scoreGraph';

// Result tokens — the same win / loss / draw families as History. An
// unfinished game (the match was ended early) gets neutral ink.
const TONE: Record<
  DetailGameVM['result'],
  { fill: string; badge: string; text: string }
> = {
  win: { fill: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { fill: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { fill: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
  unfinished: {
    fill: 'bg-border',
    badge: 'bg-elevated',
    text: 'text-ink-tertiary',
  },
};

/**
 * One game on the match detail: "Game n", your score, a bar filled to your
 * share of the points (in the result color), their score, and the W/L/D badge
 * (letter + color, never color alone). Tap to expand the game's score graph
 * when it has one (games recorded before point tracking don't).
 */
const GameCard = ({ game }: { game: DetailGameVM }) => {
  const [open, setOpen] = useState(false);
  const tone = TONE[game.result];
  const hasTimeline = game.graph !== null;
  const won = game.result === 'win';
  const lost = game.result === 'loss';

  const toggle = () => {
    if (!hasTimeline) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((o) => !o);
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Pressable
        onPress={toggle}
        disabled={!hasTimeline}
        accessibilityRole={hasTimeline ? 'button' : undefined}
        accessibilityState={hasTimeline ? { expanded: open } : undefined}
        accessibilityLabel={`Game ${game.n}, ${game.you} to ${game.them}, ${
          game.result === 'unfinished' ? 'unfinished' : game.result
        }${hasTimeline ? ', show score graph' : ''}`}
        className="min-h-[64px] flex-row items-center gap-3 px-4 py-3 active:bg-elevated"
      >
        <Text className="w-10 font-display text-[12px] leading-4 text-ink-secondary">
          {`Game\n${game.n}`}
        </Text>
        <Text
          className={`w-7 text-right font-mono text-[18px] ${
            won ? 'text-ink-primary' : 'text-ink-secondary'
          }`}
        >
          {game.you}
        </Text>
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
          <View
            className={`h-full rounded-full ${tone.fill}`}
            style={{ width: `${Math.round(game.share * 100)}%` }}
          />
        </View>
        <Text
          className={`w-7 font-mono text-[18px] ${
            lost ? 'text-ink-primary' : 'text-ink-secondary'
          }`}
        >
          {game.them}
        </Text>
        <View
          className={`h-7 w-7 items-center justify-center rounded-md ${tone.badge}`}
        >
          {game.letter ? (
            <Text className={`font-display-bold text-[12px] ${tone.text}`}>
              {game.letter}
            </Text>
          ) : (
            <Icon name="minus" size={12} className="text-ink-tertiary" />
          )}
        </View>
        {hasTimeline && (
          <Icon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            className="text-ink-secondary"
          />
        )}
      </Pressable>

      {open && game.graph && (
        <Animated.View
          entering={FadeIn.duration(180)}
          className="border-t border-border/60 px-4 pb-3.5 pt-3"
        >
          <ScoreGraph graph={game.graph} />
        </Animated.View>
      )}
    </View>
  );
};

export default GameCard;
