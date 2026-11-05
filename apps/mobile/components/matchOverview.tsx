import { Keyboard, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/authContext';
import { useMatch } from '@/contexts/matchContext';
import { resultFor, TITLE, toDetailGameVM } from '@/lib/matchDetailView';
import VersusBanner from './match/versusBanner';
import GameCard from './match/gameCard';
import InlineNote from './match/inlineNote';
import { riseIn } from './transitions';
import React from 'react';

// `background` mirrored for gradient stops: a shade under the status bar, so
// the time and battery read over bright art.
const STATUS_SHADE = ['#0D1B2AB3', '#0D1B2A00'] as const;

const RESULT_TEXT = {
  win: 'text-win-text',
  loss: 'text-loss-text',
  draw: 'text-draw-text',
} as const;

/**
 * Shown when a match is over. Built like the match detail it becomes — and
 * the between-games break before it — so the three read as one: the versus
 * banner, full bleed under the status bar, with the result ("Victory") over
 * the final score (a Bo1's points, a Bo3's games); then the Games card (each
 * game's line, tap for its score graph), and — signed in — the notes, written
 * in place. "Done" is pinned at the bottom, always in reach.
 *
 * The match was saved the moment it ended; notes added here re-sync (see
 * MatchSync). Done clears it from memory and returns to idle.
 */
const MatchOverview = () => {
  const { match, endMatch, setGameNote, setMatchNote } = useMatch();
  const { status } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (!match) return null;

  const [p1, p2] = match.players;
  const you = p1?.name ?? 'You';
  const opponent = p2?.name ?? 'Opponent';
  // p1 is always you: the result, the score order and the dimmed side follow.
  const result = resultFor(match.winnerId);
  const first = match.games[0];
  const score =
    match.bestOf === 1
      ? `${first?.scoresAtEnd.p1 ?? 0}–${first?.scoresAtEnd.p2 ?? 0}`
      : `${p1?.gameWins ?? 0}–${p2?.gameWins ?? 0}`;

  const games = match.games.map((g, i) =>
    toDetailGameVM(
      {
        id: g.id,
        n: i + 1,
        scores: g.scoresAtEnd,
        winnerId: g.winnerId,
        startedAt: g.startedAt,
        endedAt: g.endedAt,
        events: g.events,
        notes: g.notes ?? null,
      },
      opponent,
    ),
  );

  // While a note is being typed, Done first ends editing (its blur saves the
  // note) — also with a hardware keyboard, where no keyboard is showing.
  const onDone = () => {
    const focused = TextInput.State.currentlyFocusedInput();
    if (focused) {
      TextInput.State.blurTextInput(focused);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    endMatch();
  };

  return (
    <View className="flex-1 bg-background">
      {/* Notes are written in place: keep a field above the keyboard; a tap
          on empty space or a drag ends editing (which saves the note). */}
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable accessible={false} onPress={Keyboard.dismiss}>
          <Animated.View entering={FadeIn.duration(400)}>
            <VersusBanner
              you={{ name: you, legend: p1?.legend ?? null }}
              them={{ name: opponent, legend: p2?.legend ?? null }}
              outcome={result}
              title={TITLE[result]}
              titleClass={RESULT_TEXT[result]}
              score={score}
              large
              height={insets.top + 280}
              accessibilityLabel={`Match complete. ${TITLE[result]}, ${score}. ${you} versus ${opponent}.`}
            />
            <LinearGradient
              colors={STATUS_SHADE}
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 36 }}
            />
          </Animated.View>

          <View className="px-4">
            <Animated.View entering={riseIn(0)}>
              <Text className="mt-3 text-[13px] text-ink-secondary">
                Match complete · Best of {match.bestOf}
              </Text>

              <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">Games</Text>
              <View className="overflow-hidden rounded-2xl border border-border bg-surface">
                {games.map((g, i) => (
                  <GameCard key={g.id} game={g} first={i === 0} />
                ))}
              </View>
            </Animated.View>

            {/* Notes while it's fresh — each game (the last one has had no
                between-games screen) and the round. A Bo1 gets the round
                note only: its one game IS the round. Signed-in only. */}
            {status === 'authed' && (
              <Animated.View entering={riseIn(1)}>
                <Text className="mb-2 mt-6 font-display text-base text-ink-secondary">Notes</Text>
                <View className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <InlineNote
                    label="Round"
                    note={match.notes ?? null}
                    placeholder="How did the round go?"
                    onSave={async (text) => setMatchNote(text)}
                  />
                  {match.bestOf > 1 &&
                    match.games.map((game, i) => (
                      <View key={game.id} className="border-t border-border/60">
                        <InlineNote
                          label={`Game ${i + 1}`}
                          note={game.notes ?? null}
                          onSave={async (text) => setGameNote(i, text)}
                        />
                      </View>
                    ))}
                </View>
                <Text className="mt-2 px-1 text-[12px] leading-4 text-ink-tertiary">
                  You can edit these any time from the match in History.
                </Text>
              </Animated.View>
            )}

            {/* A guest's match ends here and is gone — Done discards it and
                nothing was ever written. This is the moment that loss is
                actually felt, so it's the moment worth saying so. */}
            {status === 'guest' && (
              <Animated.View entering={riseIn(1)}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/login');
                  }}
                  className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4 active:bg-elevated"
                >
                  <Text className="text-center text-sm text-ink-secondary">
                    This match wasn&apos;t saved.{' '}
                    <Text className="font-display text-accent">Sign in</Text> to keep your
                    history.
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Pressable>
      </ScrollView>

      {/* Pinned, so it's in reach however long the notes run. */}
      <View
        className="border-t border-border/60 bg-background px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          className="items-center rounded-full bg-accent px-8 py-4 active:bg-accent-strong"
        >
          <Text className="font-display-bold text-lg text-background">Done</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default MatchOverview;
