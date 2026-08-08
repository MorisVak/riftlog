import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import AuthProvider from '@/contexts/authContext';
import MatchProvider from '@/contexts/matchContext';
import MatchSync from '@/components/matchSync';

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

  // AuthProvider sits ABOVE MatchProvider: MatchSync needs both (it suppresses
  // every write while signed out), and nothing in the match layer needs to be
  // mounted for auth to resolve.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <MatchProvider>
            <MatchSync />
            <Stack screenOptions={{ animation: 'default' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              {/* Modal, not a redirect: a gated tab stays mounted behind the
                  login sheet, so dismissing returns you exactly where you were. */}
              <Stack.Screen
                name="login"
                options={{ headerShown: false, presentation: 'modal' }}
              />
              <Stack.Screen
                name="verify-otp"
                options={{ headerShown: false, presentation: 'modal' }}
              />
            </Stack>
          </MatchProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
