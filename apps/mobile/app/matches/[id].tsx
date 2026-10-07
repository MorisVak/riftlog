import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/icon';

/**
 * Match details — PLACEHOLDER. Reached from "View details" on an expanded
 * History row (`/matches/[id]`). The real screen (per-game breakdown, the
 * deck played, notes/tags — SPEC Feature 2's detail view) is a later slice;
 * the route exists now so History can link to it.
 */
const MatchDetail = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/history');
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={back}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-elevated active:bg-surface"
        >
          <Icon name="chevron-left" size={18} className="text-ink-secondary" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
          <Icon name="bar-chart-2" size={24} className="text-accent" />
        </View>
        <Text className="mt-5 font-display-bold text-2xl text-ink-primary">
          Match details
        </Text>
        <Text className="mt-2 text-center text-[15px] leading-5 text-ink-secondary">
          A full breakdown of this match is coming soon.
        </Text>
      </View>
    </View>
  );
};

export default MatchDetail;
