import { View } from 'react-native';
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
import AuthProvider, { useAuth } from '@/contexts/authContext';
import ProfileProvider, { useProfile } from '@/contexts/profileContext';
import MatchProvider from '@/contexts/matchContext';
import MatchSync from '@/components/matchSync';

/**
 * The navigator, split out so it can read auth + profile context.
 *
 * Onboarding is a guard, not a redirect effect: while `needsOnboarding` holds,
 * the app's routes don't exist and the onboarding screen is the only one that
 * does. Nothing is stored on-device to remember "mid-onboarding" — the gate is
 * re-derived from `profiles.onboarded_at` on every launch, which is what makes
 * killing the app mid-flow safe.
 */
const RootStack = () => {
  const { status } = useAuth();
  const { profileStatus, needsOnboarding } = useProfile();

  // Signed in but the profile isn't read yet: cover the app so the tabs don't
  // flash and then get yanked away by the guard. An overlay rather than
  // swapping out <Stack> keeps the navigator (and its state) mounted.
  const holding = status === 'authed' && profileStatus === 'loading';

  return (
    <>
      <Stack screenOptions={{ animation: 'default' }}>
        <Stack.Protected guard={!needsOnboarding}>
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
          <Stack.Screen
            name="decks/import"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen name="decks/[id]" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false, gestureEnabled: false }}
          />
        </Stack.Protected>
      </Stack>
      {holding && <View className="absolute inset-0 bg-background" />}
    </>
  );
};

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
  // mounted for auth to resolve. ProfileProvider sits between: it keys off the
  // session and feeds the onboarding guard in RootStack.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <MatchProvider>
              <MatchSync />
              <RootStack />
            </MatchProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
