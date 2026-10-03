import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface ICSIntegrationSettings {
  ics_url: string;
  last_synced_at: string | null;
  last_sync_added: number;
}

export async function getICSIntegration(userId: string): Promise<{ enabled: boolean; settings: ICSIntegrationSettings | null }> {
  const { data } = await supabase
    .from('integration_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('integration_key', 'google_calendar_ics')
    .maybeSingle();
  if (!data) return { enabled: false, settings: null };
  return {
    enabled: (data as { enabled: boolean }).enabled,
    settings: (data as { settings: ICSIntegrationSettings }).settings,
  };
}

export async function saveICSUrl(userId: string, icsUrl: string): Promise<void> {
  await supabase
    .from('integration_settings')
    .upsert({
      user_id: userId,
      integration_key: 'google_calendar_ics',
      enabled: true,
      settings: { ics_url: icsUrl, last_synced_at: null, last_sync_added: 0 },
    }, { onConflict: 'user_id,integration_key' });
}

export async function disableICSSync(userId: string): Promise<void> {
  await supabase
    .from('integration_settings')
    .update({ enabled: false })
    .eq('user_id', userId)
    .eq('integration_key', 'google_calendar_ics');
}

export interface SyncResult {
  added: number;
  skipped: number;
  total: number;
  error?: string;
}

export async function syncCycleFromICS(userId: string, icsUrl: string): Promise<SyncResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const functionUrl = `${supabaseUrl}/functions/v1/sync-cycle-ics`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ user_id: userId, ics_url: icsUrl }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { added: 0, skipped: 0, total: 0, error: body.error ?? `Sync failed (${response.status})` };
  }

  const data = await response.json();
  return { added: data.added ?? 0, skipped: data.skipped ?? 0, total: data.total ?? 0 };
}

export function useCycleSync() {
  const { user } = useAuth();

  async function sync(icsUrl: string): Promise<SyncResult> {
    if (!user) return { added: 0, skipped: 0, total: 0, error: 'Not signed in' };
    return syncCycleFromICS(user.id, icsUrl);
  }

  return { sync };
}
