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

function getCachedSession(): { user: AuthUser; session: Session } | null {
      try {
              for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                                    const raw = localStorage.getItem(key);
                                    if (raw) {
                                                  const parsed = JSON.parse(raw);
                                                  if (parsed?.user && parsed?.access_token) {
                                                                  return { user: parsed.user as AuthUser, session: parsed as Session };
                                                  }
                                    }
                        }
              }
      } catch {}
      return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
      const cached = useRef(getCachedSession());
      const [user, setUser] = useState<AuthUser | null>(cached.current?.user ?? null);
      const [profile, setProfile] = useState<User | null>(null);
      const [session, setSession] = useState<Session | null>(cached.current?.session ?? null);
      const [isLoading, setIsLoading] = useState(!cached.current);

  const fetchProfileRef = useRef(async (userId: string) => {
          try {
                    const userProfile = await getUserProfile(userId);
                    setProfile(userProfile);
          } catch (err) {
                    console.error('[auth] Failed to fetch profile:', err);
          }
  });

  const refreshProfile = useCallback(async () => {
          if (user?.id) { await fetchProfileRef.current(user.id); }
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
          if (cached.current?.user) {
                    fetchProfileRef.current(cached.current.user.id);
          }
          const timeout = setTimeout(() => {
                    if (!cancelled) setIsLoading(false);
          }, 3000);
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
                    if (cancelled) return;
                    clearTimeout(timeout);
                    setSession(newSession);
                    setUser(newSession?.user ?? null);
                    if (newSession?.user) {
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
          user, profile, session, isLoading,
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
