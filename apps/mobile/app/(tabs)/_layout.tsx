import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useMatch } from '@/contexts/matchContext';
import TabBar from '@/components/tabBar';
import React from 'react';

// Hoisted so the navigator is handed the SAME option objects on every render.
// This layout re-renders on every match change (it reads `phase` from context —
// a score tap, a clock pause), and rebuilding these inline made each one look
// like a fresh navigator configuration.
// No screen animation between tabs: the navigator's cross-fade flashed the
// light layer underneath through the dark screens. The bar's pill glide is
// the tab-change feedback.
const SCREEN_OPTIONS = {
  headerShown: false,
} as const;

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;
const renderNothing = () => null;

// Four tabs, Home first (the app opens on it), then by how often they're
// used: History after each match, Decks before an event, Profile rarely.
// Each holds one kind of thing; settings live on Profile, in plain sight.
export default function TabsLayout() {
  const { phase } = useMatch();
  // Hidden during a live match (the board owns the full screen).
  const hidden = phase !== 'idle';

  return (
    <Tabs screenOptions={SCREEN_OPTIONS} tabBar={hidden ? renderNothing : renderTabBar}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Feather name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: 'Decks',
          tabBarIcon: ({ color, size }) => <Feather name="layers" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
