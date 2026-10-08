import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Match, Player, PlayerId } from '@riftlog/core';
import { useAuth } from '@/contexts/authContext';
import { useMatch } from '@/contexts/matchContext';
import NoteEditor from './match/noteEditor';
import NoteRow from './match/noteRow';
import React, { useState } from 'react';
import Animated from 'react-native-reanimated';
import { riseIn } from './transitions';

type Outcome = 'win' | 'loss' | 'draw';

/**
 * A player's result from their own perspective. A null match winner means the
 * match was drawn — a Bo1 drawn game, or a Bo3 concluded early at level
 * standings (1–1); otherwise the match winner wins and the other player loses.
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
 * Summary shown when a match is over: each player's W/L/D outcome, the per-game
 * breakdown, and (signed in) notes on each game and the round. The match was
 * saved the moment it ended; notes added here re-sync (see MatchSync). "Done"
 * clears it from memory and returns to idle.
 */
const MatchOverview = () => {
  const { match, endMatch, setGameNote, setMatchNote } = useMatch();
  const { status } = useAuth();
  const router = useRouter();
  // Which note is open: a game index, 'match' for the round, or null.
  const [editing, setEditing] = useState<number | 'match' | null>(null);
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
        <Text className="mb-1 text-center font-display-bold text-2xl text-ink-primary">
          {match.winnerId === null
            ? 'Draw'
            : `${nameOf(match.winnerId)} wins`}
        </Text>
        <Text className="mb-8 text-center font-display text-sm text-ink-tertiary">
          Best of {match.bestOf}
        </Text>

        {match.players.map((player, i) => (
          <Animated.View key={player.id} entering={riseIn(i)}>
            <PlayerResultRow player={player} outcome={outcomeFor(match, player)} />
          </Animated.View>
        ))}

        <Text className="mb-3 mt-8 font-display text-sm uppercase tracking-widest text-ink-secondary">
          Games
        </Text>
        {match.games.map((game, i) => (
          <View
            key={game.id}
            className="mb-2 flex-row items-center rounded-lg border border-border bg-surface px-4 py-3"
          >
            <Text className="flex-1 text-sm text-ink-secondary">Game {i + 1}</Text>
            <Text className="flex-1 text-center font-mono text-base text-ink-primary">
              {game.scoresAtEnd.p1} – {game.scoresAtEnd.p2}
            </Text>
            <Text className="flex-1 text-right text-sm text-ink-secondary">
              {game.endedAt === null ? '—' : nameOf(game.winnerId)}
            </Text>
          </View>
        ))}

        {/* Notes while it's fresh — each game (the last one has had no
            between-games screen) and the round. The match is already saved;
            MatchSync re-syncs when these change. Signed-in only. */}
        {status === 'authed' && (
          <>
            <Text className="mb-2 mt-8 font-display text-base text-ink-secondary">
              Notes
            </Text>
            <View className="rounded-xl border border-border bg-surface px-4">
              {match.games.map((game, i) => (
                <View key={game.id} className={i > 0 ? 'border-t border-border/60' : ''}>
                  <NoteRow
                    label={`Game ${i + 1}`}
                    showLabel
                    note={game.notes}
                    prompt={`Add a note for game ${i + 1}`}
                    onPress={() => setEditing(i)}
                    lines={2}
                  />
                </View>
              ))}
              <View className="border-t border-border/60">
                <NoteRow
                  label="Round"
                  showLabel
                  note={match.notes}
                  prompt="Add notes on the round"
                  onPress={() => setEditing('match')}
                  lines={3}
                />
              </View>
            </View>
            <Text className="mt-2 px-1 text-[12px] leading-4 text-ink-tertiary">
              You can edit these any time from the match in History.
            </Text>
          </>
        )}

        {/* A guest's match ends here and is gone — Done discards it and nothing
            was ever written. This is the moment that loss is actually felt, so
            it's the moment worth saying so. */}
        {status === 'guest' && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/login');
            }}
            className="mt-8 rounded-xl border border-border bg-surface px-5 py-4 active:bg-elevated"
          >
            <Text className="text-center text-sm text-ink-secondary">
              This match wasn&apos;t saved.{' '}
              <Text className="font-display text-accent">Sign in</Text> to keep
              your history.
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onDone}
          className="mt-10 rounded-xl bg-accent px-8 py-4 shadow-accent-btn active:bg-accent-strong"
        >
          <Text className="text-center font-display-bold text-lg text-background">
            Done
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <NoteEditor
        visible={editing !== null}
        initial={
          editing === 'match'
            ? (match.notes ?? null)
            : editing !== null
              ? (match.games[editing]?.notes ?? null)
              : null
        }
        title={editing === 'match' ? 'Round notes' : `Game ${(editing ?? 0) + 1} note`}
        placeholder={
          editing === 'match'
            ? 'How did the round go? What would you change next time?'
            : 'What happened this game? Mulligans, key turns, misplays…'
        }
        onSave={(text) => {
          if (editing === 'match') setMatchNote(text);
          else if (editing !== null) setGameNote(editing, text);
        }}
        onClose={() => setEditing(null)}
      />
    </View>
  );
};

export default MatchOverview;
