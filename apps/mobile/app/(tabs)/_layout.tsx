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
const BAR_BORDER = '#2E3C56'; // border

export default function TabsLayout() {
  const { phase } = useMatch();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 11,
        },
        // Hidden during a live match (board owns the full screen).
        tabBarStyle:
          phase !== 'idle'
            ? { display: 'none' }
            : {
                height: 82,
                paddingTop: 8,
                paddingBottom: 24,
                backgroundColor: BAR_BG,
                borderTopColor: BAR_BORDER,
                borderTopWidth: 1,
                elevation: 0,
              },
      }}
    >
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
