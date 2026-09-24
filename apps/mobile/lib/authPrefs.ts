import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-local sign-in preferences. Deliberately NOT in lib/localStore.ts —
 * that file's contract is "exactly two keys, both match data, both
 * self-clearing", and this is neither match data nor self-clearing.
 *
 * Nothing here is sensitive: it's which button the user pressed last, so the
 * login screen can badge it. It never leaves the device and is not tied to an
 * account (that's the point — it has to be readable while signed OUT).
 */

export type AuthMethod = 'discord' | 'google' | 'apple' | 'email';

const KEY = 'riftlog.lastAuthMethod';

const isAuthMethod = (v: string): v is AuthMethod =>
  v === 'discord' || v === 'google' || v === 'apple' || v === 'email';

export async function getLastAuthMethod(): Promise<AuthMethod | null> {
  const raw = await AsyncStorage.getItem(KEY);
  // A value written by an older build (or a hand-edited store) shouldn't badge
  // a button that no longer exists.
  return raw !== null && isAuthMethod(raw) ? raw : null;
}

export async function setLastAuthMethod(method: AuthMethod): Promise<void> {
  await AsyncStorage.setItem(KEY, method);
}
