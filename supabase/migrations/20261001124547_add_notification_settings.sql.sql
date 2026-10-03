/*
# Add notification settings table

1. New Tables
- `notification_settings`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users with cascade delete)
  - `checkin_enabled` (boolean, default true) — whether the end-of-day check-in reminder is on
  - `checkin_time` (text, default '20:00') — local time in HH:MM format (24h)
  - `last_notification_date` (date, nullable) — the last local calendar date a notification was sent, used to prevent duplicate reminders
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  - Unique constraint on `user_id` so each user has exactly one settings row

2. Security
- Enable RLS on `notification_settings`.
- Owner-scoped CRUD: each authenticated user can only access their own row.
- user_id defaults to auth.uid() so inserts without explicit user_id succeed.
*/

CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_enabled boolean NOT NULL DEFAULT true,
  checkin_time text NOT NULL DEFAULT '20:00',
  last_notification_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notification_settings" ON notification_settings;
CREATE POLICY "select_own_notification_settings" ON notification_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notification_settings" ON notification_settings;
CREATE POLICY "insert_own_notification_settings" ON notification_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notification_settings" ON notification_settings;
CREATE POLICY "update_own_notification_settings" ON notification_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notification_settings" ON notification_settings;
CREATE POLICY "delete_own_notification_settings" ON notification_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);