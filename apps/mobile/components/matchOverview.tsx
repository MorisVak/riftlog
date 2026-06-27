import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Match, Player, PlayerId } from '@riftlog/core';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

type Outcome = 'win' | 'loss' | 'draw';

/**
 * A player's result from their own perspective. A null match winner means the
 * match was drawn (only possible in a Bo1 today); otherwise the match winner
 * wins and the other player loses.
 */
const outcomeFor = (match: Match, player: Player): Outcome => {
  if (match.winnerId === null) return 'draw';
  return match.winnerId === player.id ? 'win' : 'loss';
};

// Result tokens, paired with a letter so color is never the only signal.
const RESULT = {
  win: { letter: 'W', bar: 'bg-win', badge: 'bg-win-tint', text: 'text-win-text' },
  loss: { letter: 'L', bar: 'bg-loss', badge: 'bg-loss-tint', text: 'text-loss-text' },
  draw: { letter: 'D', bar: 'bg-draw', badge: 'bg-draw-tint', text: 'text-draw-text' },
} as const;

const PlayerResultRow = ({ player, outcome }: { player: Player; outcome: Outcome }) => {
  const r = RESULT[outcome];
  return (
    <View className="mb-3 flex-row items-center overflow-hidden rounded-xl border border-border bg-surface">
      <View className={`h-full w-1.5 self-stretch ${r.bar}`} />
      <View className={`m-3 h-9 w-9 items-center justify-center rounded-lg ${r.badge}`}>
        <Text className={`font-display-bold text-lg ${r.text}`}>{r.letter}</Text>
      </View>
      <Text className="flex-1 text-base font-semibold text-ink-primary">
        {player.name}
      </Text>
      <Text className="mr-4 text-base tabular-nums text-ink-secondary">
        {player.gameWins} {player.gameWins === 1 ? 'win' : 'wins'}
      </Text>
    </View>
  );
};

/**
 * In-memory summary shown when a match is over. Per-game breakdown plus each
 * player's W/L/D outcome. Not persisted (no cloud store yet) — "Done" discards
 * and returns to idle.
 */
const MatchOverview = () => {
  const { match, endMatch } = useMatch();
  if (!match) return null;

  const nameOf = (id: PlayerId | null) =>
    id === null ? 'Draw' : (match.players.find((p) => p.id === id)?.name ?? id);

  const onDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    endMatch();
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-6 pb-6 pt-16">
        <Text className="mb-1 text-center font-display text-sm uppercase tracking-widest text-ink-secondary">
          Match complete
        </Text>
        <Text className="mb-8 text-center font-display-bold text-2xl text-ink-primary">
          {match.winnerId === null
            ? 'Draw'
            : `${nameOf(match.winnerId)} wins`}{' '}
          <Text className="text-ink-tertiary">
            · Best of {match.bestOf}
          </Text>
        </Text>

        {match.players.map((player) => (
          <PlayerResultRow
            key={player.id}
            player={player}
            outcome={outcomeFor(match, player)}
          />
        ))}

        <Text className="mb-3 mt-8 font-display text-sm uppercase tracking-widest text-ink-secondary">
          Games
        </Text>
        {match.games.map((game, i) => (
          <View
            key={game.id}
            className="mb-2 flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
          >
            <Text className="text-sm text-ink-secondary">Game {i + 1}</Text>
            <Text className="font-mono text-base text-ink-primary">
              {game.scoresAtEnd.p1} – {game.scoresAtEnd.p2}
            </Text>
            <Text className="text-sm text-ink-secondary">
              {game.endedAt === null ? '—' : nameOf(game.winnerId)}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={onDone}
          className="mt-10 rounded-xl bg-accent px-8 py-4 active:bg-accent-strong"
        >
          <Text className="text-center font-display-bold text-lg text-background">
            Done
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default MatchOverview;
