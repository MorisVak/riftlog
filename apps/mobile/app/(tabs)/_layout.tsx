import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { useMatch } from '@/contexts/matchContext';
import React from 'react';

// Navigator style objects can't take NativeWind classNames, so the tab bar
// references the palette by raw value. These mirror the design tokens 1:1
// (see tailwind.config.js): accent / ink-secondary / surface / border.
const ACTIVE = '#8B93D9'; // accent
const INACTIVE = '#868FB0'; // ink-secondary
const BAR_BG = '#18223A'; // surface
const BAR_BORDER = '#3E506E'; // border

// Hoisted so the navigator is handed the SAME option objects on every render.
// This layout re-renders on every match change (it reads `phase` from context —
// a score tap, a clock pause), and rebuilding these inline made each one look
// like a fresh navigator configuration.
const LABEL_STYLE = {
  fontFamily: 'SpaceGrotesk_600SemiBold',
  fontSize: 11,
} as const;

const BAR_HIDDEN = { display: 'none' } as const;

const BAR_VISIBLE = {
  height: 82,
  paddingTop: 8,
  paddingBottom: 24,
  backgroundColor: BAR_BG,
  borderTopColor: BAR_BORDER,
  borderTopWidth: 1,
  elevation: 0,
} as const;

export default function TabsLayout() {
  const { phase } = useMatch();
  // Hidden during a live match (board owns the full screen).
  const hidden = phase !== 'idle';

  const screenOptions = React.useMemo(
    () => ({
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarActiveTintColor: ACTIVE,
      tabBarInactiveTintColor: INACTIVE,
      tabBarLabelStyle: LABEL_STYLE,
      tabBarStyle: hidden ? BAR_HIDDEN : BAR_VISIBLE,
    }),
    [hidden],
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Feather name="list" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
