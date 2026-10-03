import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigurationError } from './supabase';
import type { Profile } from './types';
import {
  DEFAULT_QUICK_EVENTS,
  DEFAULT_MOOD_OPTIONS,
  DEFAULT_DAILY_STATE_LABELS,
  DEFAULT_TRAINING_WIN_TYPES,
  DEFAULT_NUTRITION_WIN_TYPES,
} from './constants';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error.message);
      return;
    }

    if (!data) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          quick_events: DEFAULT_QUICK_EVENTS,
          mood_options: DEFAULT_MOOD_OPTIONS,
          daily_state_labels: DEFAULT_DAILY_STATE_LABELS,
          training_win_types: DEFAULT_TRAINING_WIN_TYPES,
          nutrition_win_types: DEFAULT_NUTRITION_WIN_TYPES,
        })
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.error('Error creating profile:', insertError.message);
        return;
      }
      setProfile(newProfile as Profile);
    } else {
      setProfile(data as Profile);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (supabaseConfigurationError) return { error: supabaseConfigurationError };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch {
      return { error: 'Unable to reach the server. Please check your connection and try again.' };
    }
  }

  async function signUp(email: string, password: string) {
    if (supabaseConfigurationError) return { error: supabaseConfigurationError };
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    } catch {
      return { error: 'Unable to reach the server. Please check your connection and try again.' };
    }
  }

  async function signInWithGoogle() {
    if (supabaseConfigurationError) return { error: supabaseConfigurationError };
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return { error: error?.message ?? null };
    } catch {
      return { error: 'Unable to reach the server. Please check your connection and try again.' };
    }
  }

  async function resetPassword(email: string) {
    if (supabaseConfigurationError) return { error: supabaseConfigurationError };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error: error?.message ?? null };
    } catch {
      return { error: 'Unable to reach the server. Please check your connection and try again.' };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signInWithGoogle, resetPassword, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
