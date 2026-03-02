import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as AuthUser, Session } from '@supabase/supabase-js';
import type { User } from '../types/database';
import { getUserProfile } from '../services/auth';

interface AuthContextType {
  user: AuthUser | null;
  profile: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const userProfile = await getUserProfile(userId);
    setProfile(userProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  const handleSignOut = useCallback(async () => {
    try {
      setUser(null);
      setProfile(null);
      setSession(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      return { error: err instanceof Error ? err : new Error('Failed to sign out') };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Timeout: don't hang forever if Supabase is slow
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[auth] Session check timed out after 5s');
        setIsLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (cancelled) return;
      clearTimeout(timeout);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Non-blocking: don't wait for profile to finish loading
        fetchProfile(currentSession.user.id).catch(console.error);
      }

      setIsLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      clearTimeout(timeout);
      console.error('[auth] Session check failed:', err);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        fetchProfile(newSession.user.id).catch(console.error);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    refreshProfile,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
