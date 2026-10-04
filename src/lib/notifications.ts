import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { NotificationSettings, PushSubscriptionRow } from '@/lib/types';
import { DEFAULT_CHECKIN_TIME } from '@/lib/constants';

type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<PermissionState>('default');
  const [loading, setLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission as PermissionState);
    }
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setSettings(data as NotificationSettings);
    } else {
      const { data: created } = await supabase
        .from('notification_settings')
        .insert({ user_id: user.id, checkin_enabled: true, checkin_time: DEFAULT_CHECKIN_TIME })
        .select('*')
        .maybeSingle();
      if (created) setSettings(created as NotificationSettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    return result as PermissionState;
  }, []);

  const recheckPermission = useCallback((): PermissionState => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }
    const current = Notification.permission as PermissionState;
    setPermission(current);
    return current;
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Pick<NotificationSettings, 'checkin_enabled' | 'checkin_time'>>) => {
    if (!user || !settings) return;
    const { data } = await supabase
      .from('notification_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select('*')
      .maybeSingle();
    if (data) setSettings(data as NotificationSettings);
  }, [user, settings]);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user || !pushSupported || !VAPID_PUBLIC_KEY) return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const sub = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = sub.keys?.p256dh;
      const auth = sub.keys?.auth;

      if (!endpoint || !p256dh || !auth) return false;

      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' });

      return true;
    } catch {
      return false;
    }
  }, [user, pushSupported]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!user || !pushSupported) return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
      return true;
    } catch {
      return false;
    }
  }, [user, pushSupported]);

  const hasPushSubscription = useCallback(async (): Promise<boolean> => {
    if (!user || !pushSupported) return false;
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    return ((data as PushSubscriptionRow[] | null) ?? []).length > 0;
  }, [user, pushSupported]);

  return {
    settings,
    permission,
    loading,
    pushSupported,
    requestPermission,
    recheckPermission,
    updateSettings,
    subscribeToPush,
    unsubscribeFromPush,
    hasPushSubscription,
    reload: loadSettings,
  };
}
