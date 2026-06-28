import React from 'react';
import { Text, View } from 'react-native';

/**
 * Profile tab. The design's profile (stats, decks, account) needs persisted
 * history and auth, both deferred — so this is an honest placeholder until
 * Supabase lands.
 */
const Profile = () => {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="font-display-bold text-2xl text-ink-primary">Profile</Text>
      <Text className="mt-2 text-center text-sm text-ink-secondary">
        Stats, decks, and account live here. Sign-in &amp; cloud sync are coming
        soon.
      </Text>
    </View>
  );
};

export default Profile;
