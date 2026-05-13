import { Stack } from 'expo-router';
import './global.css';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ animation: 'default' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
