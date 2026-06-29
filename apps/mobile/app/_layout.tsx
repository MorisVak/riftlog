import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import MatchSync from '@/components/matchSync';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Establish an anonymous session on first launch so every device has an
  // auth.uid() to own its match rows. persistSession restores it on later
  // launches, so this only signs in when there's no session yet.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return;
      supabase.auth.signInAnonymously().then(({ error }) => {
        if (error) {
          console.warn('[auth] anonymous sign-in failed', error.message);
        }
      });
    });
  }, []);

  // Hold the splash until the design fonts are ready so numerals and headings
  // don't flash a fallback face on first paint.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <MatchProvider>
        <MatchSync />
        <Stack screenOptions={{ animation: 'default' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </MatchProvider>
    </SafeAreaProvider>
  );
}
