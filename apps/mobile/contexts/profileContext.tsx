import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { Profile } from '@riftlog/core';
import { useAuth } from '@/contexts/authContext';
import { fetchMyProfile } from '@/lib/profile';

/**
 * The signed-in user's profile row, read from Postgres — never cached locally,
 * same as history. It exists mainly to drive the onboarding gate in
 * app/_layout.tsx, which is why the states are explicit:
 *
 *   idle    — signed out (or auth still loading); there is no profile to have.
 *   loading — first fetch for THIS user is in flight. The root layout holds a
 *             blank screen so the tabs don't flash before a redirect.
 *   ready   — fetched. `profile` may still be null: the seed trigger swallows
 *             its own failures, and onboarding repairs a missing row.
 *   error   — fetch failed (typically offline at launch). Deliberately NOT a
 *             gate: the live tracker must work offline, so an unknown profile
 *             lets the user into the app and we retry on reconnect/foreground.
 *
 * `needsOnboarding` is derived, never stored — same rule as `phase`/`status`.
 * It flips false only from a server read of `onboarded_at`, which is what
 * makes onboarding resumable: kill the app mid-flow and the next launch reads
 * null again and lands back on it.
 */

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProfileContextType = {
  profile: Profile | null;
  profileStatus: ProfileStatus;
  needsOnboarding: boolean;
  /** Re-read the row, e.g. after completing onboarding or on tab focus. */
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, status: authStatus } = useAuth();
  const userId = authStatus === 'authed' ? (user?.id ?? null) : null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');

  // Only the latest request may write state. Guards against a slow response
  // for a previous user (sign-out → sign-in as someone else) landing late.
  const requestId = useRef(0);

  const load = useCallback(async (uid: string, initial: boolean) => {
    const id = ++requestId.current;
    if (initial) setProfileStatus('loading');
    try {
      const next = await fetchMyProfile();
      if (id !== requestId.current) return;
      setProfile(next);
      setProfileStatus('ready');
    } catch (e) {
      if (id !== requestId.current) return;
      // A refresh that fails keeps the last good row; only a first load with
      // nothing to show falls to `error`.
      setProfileStatus((prev) => (prev === 'ready' ? prev : 'error'));
      if (__DEV__) {
        console.warn(`[profile] fetch failed for ${uid}:`, e);
      }
    }
  }, []);

  // New user (or signed out): reset and load from scratch. Keyed on the user
  // id, not the session, so token refreshes don't refetch.
  useEffect(() => {
    requestId.current++;
    setProfile(null);
    if (userId === null) {
      setProfileStatus('idle');
      return;
    }
    void load(userId, true);
  }, [userId, load]);

  // Offline at launch leaves us in `error`. Retry when that's likely fixed.
  useEffect(() => {
    if (userId === null || profileStatus !== 'error') return;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) void load(userId, false);
    });
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load(userId, false);
    });
    return () => {
      unsubscribeNet();
      appStateSub.remove();
    };
  }, [userId, profileStatus, load]);

  const refresh = useCallback(async () => {
    if (userId !== null) await load(userId, false);
  }, [userId, load]);

  const value = useMemo<ProfileContextType>(
    () => ({
      profile,
      profileStatus,
      needsOnboarding:
        profileStatus === 'ready' &&
        (profile === null || profile.onboardedAt == null),
      refresh,
    }),
    [profile, profileStatus, refresh],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
};

export default ProfileProvider;
