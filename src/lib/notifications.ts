import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { todayString } from '@/lib/date';
import type { NotificationSettings, DailyLog, TrainingWin, NutritionWin } from '@/lib/types';
import {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_MESSAGES_HAS_STATE,
  NOTIFICATION_MESSAGES_HAS_TRAINING,
  NOTIFICATION_MESSAGES_HAS_ALL,
  DEFAULT_CHECKIN_TIME,
} from '@/lib/constants';

type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function useNotifications() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<PermissionState>('default');
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission as PermissionState);
    }
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

  return {
    settings,
    permission,
    loading,
    requestPermission,
    recheckPermission,
    updateSettings,
    reload: loadSettings,
  };
}

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

async function getTodayCheckinStatus(userId: string): Promise<{
  hasState: boolean;
  hasTraining: boolean;
  hasNutrition: boolean;
}> {
  const today = todayString();
  const [logRes, trainRes, nutRes] = await Promise.all([
    supabase.from('daily_logs').select('daily_state').eq('user_id', userId).eq('date', today).maybeSingle(),
    supabase.from('training_wins').select('id').eq('user_id', userId).eq('date', today),
    supabase.from('nutrition_wins').select('id').eq('user_id', userId).eq('date', today),
  ]);
  const log = logRes.data as DailyLog | null;
  return {
    hasState: !!log?.daily_state,
    hasTraining: ((trainRes.data as TrainingWin[] | null) ?? []).length > 0,
    hasNutrition: ((nutRes.data as NutritionWin[] | null) ?? []).length > 0,
  };
}

export function getAdaptiveMessage(status: { hasState: boolean; hasTraining: boolean; hasNutrition: boolean }): string {
  if (status.hasState && status.hasTraining && status.hasNutrition) {
    return getRandomMessage(NOTIFICATION_MESSAGES_HAS_ALL);
  }
  if (status.hasState && (status.hasTraining || status.hasNutrition)) {
    return getRandomMessage(NOTIFICATION_MESSAGES_HAS_STATE);
  }
  if (status.hasTraining && !status.hasNutrition) {
    return getRandomMessage(NOTIFICATION_MESSAGES_HAS_TRAINING);
  }
  return getRandomMessage(NOTIFICATION_MESSAGES);
}

export async function shouldSendNotification(userId: string, settings: NotificationSettings): Promise<{ shouldSend: boolean; message: string }> {
  if (!settings.checkin_enabled) return { shouldSend: false, message: '' };
  const today = todayString();
  if (settings.last_notification_date === today) return { shouldSend: false, message: '' };
  const status = await getTodayCheckinStatus(userId);
  if (status.hasState && status.hasTraining && status.hasNutrition) {
    return { shouldSend: false, message: '' };
  }
  return { shouldSend: true, message: getAdaptiveMessage(status) };
}

export function useNotificationScheduler() {
  const { user } = useAuth();
  const { settings, permission } = useNotifications();
  const checkedTodayRef = useRef(false);

  const checkAndNotify = useCallback(async () => {
    if (!user || !settings || permission !== 'granted') return;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const [settingsHour, settingsMin] = settings.checkin_time.split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = settingsHour * 60 + settingsMin;
    if (nowMinutes < targetMinutes) return;

    const { shouldSend, message } = await shouldSendNotification(user.id, settings);
    if (!shouldSend) return;

    try {
      new Notification('My Rhythm', { body: message, tag: 'rhythm-checkin', silent: true });
      await supabase.from('notification_settings').update({ last_notification_date: todayString() }).eq('id', settings.id);
    } catch {
      // notification failed — try again next tick
    }
  }, [user, settings, permission]);

  useEffect(() => {
    if (!settings || permission !== 'granted') return;
    const interval = setInterval(() => {
      checkAndNotify();
    }, 60000);
    checkAndNotify();
    return () => clearInterval(interval);
  }, [checkAndNotify, settings, permission]);

  useEffect(() => {
    checkedTodayRef.current = false;
  }, [settings?.user_id]);
}
