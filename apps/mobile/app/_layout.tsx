import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import './global.css';
import MatchProvider from '@/contexts/matchContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Hold the splash until the design fonts are ready so numerals and headings
  // don't flash a fallback face on first paint.
  if (!fontsLoaded) return null;

  return (
    <MatchProvider>
      <Stack screenOptions={{ animation: 'default' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </MatchProvider>
  );
}
