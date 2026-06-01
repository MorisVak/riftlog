import { Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMatch } from '@/contexts/matchContext';
import PlayField from '@/components/playField';
import React from 'react';

const Index = () => {
  const { gameStarted, startMatch, endMatch } = useMatch();

  return (
    <View className="flex-1 bg-darkerBackground">
      {gameStarted ? (
        <>
          <PlayField />
          <View
            pointerEvents="box-none"
            className="absolute inset-0 items-center justify-center"
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                endMatch();
              }}
              className="rounded-lg bg-[#7A1F2B] px-6 py-3 active:bg-[#5C1620]"
            >
              <Text className="text-[#F5D6D6] text-base font-bold">END</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              startMatch();
            }}
            className="rounded-lg bg-white px-8 py-4"
          >
            <Text className="text-black text-lg font-bold">START</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Index;
