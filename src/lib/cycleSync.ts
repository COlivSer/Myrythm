import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface ICSIntegrationSettings {
  ics_url: string;
  last_synced_at: string | null;
  last_sync_added: number;
}

export async function getICSIntegration(
  userId: string
): Promise<{ enabled: boolean; settings: ICSIntegrationSettings | null }> {
  const { data, error } = await supabase
    .from('integration_settings')
    .select('enabled, settings')
    .eq('user_id', userId)
    .eq('integration_key', 'google_calendar_ics')
    .maybeSingle();

  if (error || !data) return { enabled: false, settings: null };

  return {
    enabled: Boolean(data.enabled),
    settings: (data.settings as ICSIntegrationSettings) ?? null,
  };
}

export async function saveICSUrl(userId: string, icsUrl: string): Promise<void> {
  // Fetch existing settings to preserve last_synced_at / last_sync_added
  const existing = await getICSIntegration(userId);

  const updatedSettings: ICSIntegrationSettings = {
    ics_url: icsUrl,
    last_synced_at: existing.settings?.last_synced_at ?? null,
    last_sync_added: existing.settings?.last_sync_added ?? 0,
  };

  const { error } = await supabase
    .from('integration_settings')
    .upsert(
      {
        user_id: userId,
        integration_key: 'google_calendar_ics',
        enabled: true,
        settings: updatedSettings,
      },
      { onConflict: 'user_id,integration_key' }
    );

  if (error) throw new Error(error.message);
}

export async function disableICSSync(userId: string): Promise<void> {
  const { error } = await supabase
    .from('integration_settings')
    .update({ enabled: false })
    .eq('user_id', userId)
    .eq('integration_key', 'google_calendar_ics');

  if (error) throw new Error(error.message);
}

export interface SyncResult {
  added: number;
  skipped: number;
  total: number;
  error?: string;
}

export async function syncCycleFromICS(userId: string, icsUrl: string): Promise<SyncResult> {
  // Use official Supabase client invoke method to pass the logged-in user's Auth token automatically
  const { data, error } = await supabase.functions.invoke('sync-cycle-ics', {
    body: { user_id: userId, ics_url: icsUrl },
  });

  if (error) {
    return {
      added: 0,
      skipped: 0,
      total: 0,
      error: error.message || 'Sync failed',
    };
  }

  return {
    added: data?.added ?? 0,
    skipped: data?.skipped ?? 0,
    total: data?.total ?? 0,
  };
}

export function useCycleSync() {
  const { user } = useAuth();

  async function sync(icsUrl: string): Promise<SyncResult> {
    if (!user) return { added: 0, skipped: 0, total: 0, error: 'Not signed in' };
    return syncCycleFromICS(user.id, icsUrl);
  }

  return { sync };
}