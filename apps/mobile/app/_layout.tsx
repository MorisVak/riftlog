import { Stack } from 'expo-router';
import './global.css';
import MatchProvider from '@/contexts/matchContext';

export default function RootLayout() {
  return (
    <MatchProvider>
      <Stack screenOptions={{ animation: 'default' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </MatchProvider>
  );
}
