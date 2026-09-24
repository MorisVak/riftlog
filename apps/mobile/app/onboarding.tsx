import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/authContext';
import Avatar from '@/components/avatar';

/**
 * First-login onboarding. Reachable only while `needsOnboarding` holds (see
 * the Stack.Protected guard in app/_layout.tsx) — onboarded users never see
 * it, and there's no back gesture out of it.
 *
 * PLACEHOLDER: the handle + display-name step lands in the next slice.
 * Sign out is the escape hatch so nobody is trapped on this screen.
 */
const Onboarding = () => {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <View
      className="flex-1 items-center bg-background px-6"
      style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }}
    >
      <Avatar size={88} />
      <Text className="mt-6 text-center font-display-bold text-2xl text-ink-primary">
        Set up your profile
      </Text>
      <Text className="mt-2 text-center text-sm leading-5 text-ink-secondary">
        Pick a handle and a display name.
      </Text>

      <View className="flex-1" />

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => void signOut()}
        className="px-5 py-3"
      >
        <Text className="text-center text-sm text-ink-secondary">Sign out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding;
