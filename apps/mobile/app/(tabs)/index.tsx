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
            className="rounded-lg bg-[#7A1F2B] px-6 py-3 active:bg-[#5C1620]"
          >
            <Text className="text-[#F5D6D6] text-base font-bold">END</Text>
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
          className="rounded-lg bg-white px-8 py-4"
        >
          <Text className="text-black text-lg font-bold">START</Text>
        </TouchableOpacity>
      </View>
      {setupOpen && <MatchSetup onClose={() => setSetupOpen(false)} />}
    </View>
  );
};

export default Index;
