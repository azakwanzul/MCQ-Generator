import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    async signUpWithPassword(email: string, password: string) {
      if (!supabase) return { error: 'Auth is not configured' };
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? { error: error.message } : {};
    },
    async signInWithPassword(email: string, password: string) {
      if (!supabase) return { error: 'Auth is not configured' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  }), [session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


