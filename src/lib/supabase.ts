import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function hasExpiredKey(key: string): boolean {
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export const supabaseConfigurationError = hasExpiredKey(supabaseAnonKey)
  ? 'Your Supabase connection key has expired. Refresh the connected database credentials in Bolt, then reload this app.'
  : null;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
