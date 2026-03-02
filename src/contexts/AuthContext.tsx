import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
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

  const fetchProfileRef = useRef(async (userId: string) => {
        try {
                const userProfile = await getUserProfile(userId);
                setProfile(userProfile);
        } catch (err) {
                console.error('[auth] Failed to fetch profile:', err);
        }
  });

  const refreshProfile = useCallback(async () => {
        if (user?.id) {
                await fetchProfileRef.current(user.id);
        }
  }, [user?.id]);

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
        let hasResolved = false;

                // Safety timeout: if onAuthStateChange never fires (very rare edge case)
                const timeout = setTimeout(() => {
                        if (!cancelled && !hasResolved) {
                                  console.warn('[auth] Auth init timed out after 8s, proceeding without session');
                                  hasResolved = true;
                                  setIsLoading(false);
                        }
                }, 8000);

                // Use onAuthStateChange as the SOLE source of truth.
                // Supabase v2 fires INITIAL_SESSION as the first event with the cached session,
                // eliminating the race condition between getSession() and onAuthStateChange.
                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
                        if (cancelled) return;

                                                                                         if (!hasResolved) {
                                                                                                   hasResolved = true;
                                                                                                   clearTimeout(timeout);
                                                                                         }

                                                                                         setSession(newSession);
                        setUser(newSession?.user ?? null);

                                                                                         if (newSession?.user) {
                                                                                                   // Non-blocking: fetch profile in background
                          fetchProfileRef.current(newSession.user.id);
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
  }, []);

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
