import { Tabs } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { useMatch } from '@/contexts/matchContext';

export default function TabsLayout() {
  const { gameStarted } = useMatch();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarItemStyle: {
          flex: 1,
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarStyle: gameStarted
          ? { display: 'none' }
          : {
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 4,
              position: 'absolute',
              backgroundColor: '#F9F4EE',
              borderColor: '#2E4D6B',
              borderWidth: 1,
              bottom: 50,
              left: 20,
              right: 20,
              borderRadius: 50,
              height: 52,
              marginHorizontal: 20,
              elevation: 0,
              paddingBottom: 0,
              paddingTop: 0,
            },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#2E4D6B',
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="history"
        options={{
          title: 'history',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="folder" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Main',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="setting" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="setting" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
