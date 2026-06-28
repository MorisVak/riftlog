import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import PlayField from '@/components/playField';
import BetweenGamesScreen from '@/components/betweenGamesScreen';
import MatchOverview from '@/components/matchOverview';
import MatchSetup from '@/components/matchSetup';
import React, { useState } from 'react';

/**
 * Stats + recent-matches strip on the design's home screen. Both need persisted
 * history, which doesn't exist yet (no Supabase, no on-device store), so we show
 * an honest empty state instead of fabricated numbers. Wired up once cloud
 * persistence lands.
 */
const HistoryEmptyState = () => (
  <View className="mt-10 w-full rounded-2xl border border-border bg-surface px-6 py-8">
    <Text className="text-center font-display text-base text-ink-primary">
      No saved matches yet
    </Text>
    <Text className="mt-2 text-center text-sm text-ink-secondary">
      Play your first match to start a history. Sign-in &amp; cloud sync are
      coming soon.
    </Text>
  </View>
);

const Index = () => {
  const { phase } = useMatch();
  const [setupOpen, setSetupOpen] = useState(false);

  if (phase === 'over') {
    return (
      <View className="flex-1 bg-background">
        <MatchOverview />
      </View>
    );
  }

  if (phase === 'between-games') {
    return (
      <View className="flex-1 bg-background">
        <BetweenGamesScreen />
      </View>
    );
  }

  if (phase === 'playing') {
    return (
      <View className="flex-1 bg-background">
        <PlayField />
      </View>
    );
  }

  // phase === 'idle' — home hero
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="font-display-bold text-4xl tracking-tight text-ink-primary">
          Riftlog
        </Text>
        <Text className="mt-2 mb-10 text-center text-sm text-ink-secondary">
          Track your Riftbound matches
        </Text>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSetupOpen(true);
          }}
          className="rounded-full bg-accent px-12 py-4 active:bg-accent-strong"
        >
          <Text className="font-display-bold text-lg tracking-wide text-background">
            START
          </Text>
        </Pressable>

        <HistoryEmptyState />
      </View>
      {setupOpen && <MatchSetup onClose={() => setSetupOpen(false)} />}
    </View>
  );
};

export default Index;
