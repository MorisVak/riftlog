import React from 'react';
import { Text, View } from 'react-native';

/**
 * History tab. The match-history list in the design needs persisted matches,
 * which don't exist yet (no Supabase, no on-device store) — so this is an
 * honest empty state until cloud sync lands.
 */
const History = () => {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="font-display-bold text-2xl text-ink-primary">History</Text>
      <Text className="mt-2 text-center text-sm text-ink-secondary">
        Your past matches will appear here once cloud sync is available.
      </Text>
    </View>
  );
};

export default History;
