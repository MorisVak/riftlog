import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import PlayField from '@/components/playField';
import EndGamePrompt from '@/components/endGamePrompt';
import BetweenGamesScreen from '@/components/betweenGamesScreen';
import MatchOverview from '@/components/matchOverview';
import MatchSetup from '@/components/matchSetup';
import React, { useState } from 'react';

const Index = () => {
  const { phase } = useMatch();
  const [promptOpen, setPromptOpen] = useState(false);
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
        <View
          pointerEvents="box-none"
          className="absolute inset-0 items-center justify-center"
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPromptOpen(true);
            }}
            className="rounded-full bg-accent px-6 py-3 active:bg-accent-strong"
          >
            <Text className="text-background text-base font-bold">END</Text>
          </TouchableOpacity>
        </View>
        {promptOpen && <EndGamePrompt onClose={() => setPromptOpen(false)} />}
      </View>
    );
  }

  // phase === 'idle'
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSetupOpen(true);
          }}
          className="rounded-2xl bg-accent px-8 py-4 active:bg-accent-strong"
        >
          <Text className="text-background text-lg font-bold">START</Text>
        </TouchableOpacity>
      </View>
      {setupOpen && <MatchSetup onClose={() => setSetupOpen(false)} />}
    </View>
  );
};

export default Index;
