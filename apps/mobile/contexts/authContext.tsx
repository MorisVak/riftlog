import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearInProgressMatch, clearOutbox } from '@/lib/localStore';

/**
 * The single source of auth state for the app. There is exactly one data path:
 *
 *   authed → server-backed. Matches persist, history reads from Postgres, a
 *            profiles row exists.
 *   guest  → ephemeral sandbox. Home works; NOTHING is written anywhere (not
 *            Postgres, not the in-progress key, not the outbox), and the guest
 *            match is discarded on login rather than migrated.
 *
 * There is no anonymous sign-in and no account conversion — that's what makes
 * "one data path" true rather than aspirational. See components/matchSync.tsx
 * for the write-suppression rules that enforce it.
 */

export type AuthStatus = 'loading' | 'authed' | 'guest';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  /**
   * Derived, never stored — same convention as matchContext's `phase`.
   * `loading` is its own state on purpose: treating "not yet known" as `guest`
   * flashes the login gate over every account-only tab on cold start.
   */
  status: AuthStatus;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Supabase's JS client refreshes on a timer, which iOS suspends in the
// background. The recommended RN pairing is to drive it off AppState so a
// foregrounded app refreshes immediately instead of waking with a stale JWT.
// Registered at module scope: it's process-wide, not per-mount.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Restored from LargeSecureStore if a real session was persisted.
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });

    // Covers sign-in, sign-out, token refresh, and the OAuth redirect landing.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const status: AuthStatus = !ready
      ? 'loading'
      : session
        ? 'authed'
        : 'guest';

    return {
      session,
      user: session?.user ?? null,
      status,
      signOut: async () => {
        await supabase.auth.signOut();
        // Both local stores are account-scoped even though neither records an
        // account: outbox rows carry NO user_id (the column defaults from
        // auth.uid() at insert time), so a match queued by one account and
        // flushed while another is signed in would be written to the WRONG
        // user. Clearing on sign-out is what prevents that.
        await clearInProgressMatch();
        await clearOutbox();
      },
    };
  }, [session, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthProvider;
