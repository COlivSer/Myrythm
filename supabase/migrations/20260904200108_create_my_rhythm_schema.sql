/*
# My Rhythm — Complete Database Schema

## Overview
Creates the full database for "My Rhythm", a mobile-first ADHD-friendly wellbeing
and fitness tracking app. Every user's data is private and isolated via Row Level
Security scoped to the authenticated user.

## New Tables
1. `profiles` — user display name and preferences (1:1 with auth.users)
2. `daily_logs` — one record per day: daily_state (good/ok/hard), energy, mood, sleep, overwhelm, notes
3. `events` — quick events logged on a given day (e.g. "skipped gym", "overwhelmed")
4. `training_wins` — training wins with optional type and difficulty
5. `nutrition_wins` — nutrition wins with optional type and difficulty
6. `toolkit_categories` — user-created toolkit categories (Gym, Nutrition, etc.)
7. `toolkit_items` — tools within categories, with steps/checklists
8. `toolkit_files` — private files attached to toolkit items (stored in Supabase Storage)
9. `monthly_goals` — monthly training/nutrition percentage goals
10. `integration_settings` — placeholder for future integrations (Google Calendar, etc.)

## Security
- RLS enabled on ALL tables.
- Every table has `user_id uuid NOT NULL DEFAULT auth.uid()`.
- 4 CRUD policies per table, all scoped `TO authenticated` with `auth.uid() = user_id`.
- A private Supabase Storage bucket `toolkit_files` for user file uploads.
- Storage policies scoped to authenticated owner via `auth.uid()`.

## Notes
- `daily_logs` has a unique constraint on (user_id, date) so each day has one log.
- `difficult_day_win` is a boolean on training_wins/nutrition_wins: true when the
  daily_state for that date is 'hard' AND a win was recorded.
- All optional fields default to NULL and are never interpreted as negative.
*/

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  quick_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  mood_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_state_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  training_win_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  nutrition_win_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profiles" ON profiles;
CREATE POLICY "select_own_profiles" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profiles" ON profiles;
CREATE POLICY "insert_own_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profiles" ON profiles;
CREATE POLICY "update_own_profiles" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profiles" ON profiles;
CREATE POLICY "delete_own_profiles" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- DAILY LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  daily_state text NOT NULL CHECK (daily_state IN ('good', 'ok', 'hard')),
  energy int CHECK (energy >= 1 AND energy <= 10),
  overwhelm int CHECK (overwhelm >= 1 AND overwhelm <= 10),
  mood text,
  sleep_hours numeric(4,1),
  sleep_quality text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_daily_logs" ON daily_logs;
CREATE POLICY "select_own_daily_logs" ON daily_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_daily_logs" ON daily_logs;
CREATE POLICY "insert_own_daily_logs" ON daily_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_daily_logs" ON daily_logs;
CREATE POLICY "update_own_daily_logs" ON daily_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_daily_logs" ON daily_logs;
CREATE POLICY "delete_own_daily_logs" ON daily_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs (user_id, date);

-- =========================================================
-- EVENTS (quick events)
-- =========================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  event_key text NOT NULL,
  event_label text NOT NULL,
  event_icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_events" ON events;
CREATE POLICY "select_own_events" ON events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_events" ON events;
CREATE POLICY "insert_own_events" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_events" ON events;
CREATE POLICY "update_own_events" ON events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_events" ON events;
CREATE POLICY "delete_own_events" ON events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_events_user_date ON events (user_id, date);

-- =========================================================
-- TRAINING WINS
-- =========================================================
CREATE TABLE IF NOT EXISTS training_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  win_type text,
  difficulty text CHECK (difficulty IN ('no', 'a_little', 'very_difficult')),
  difficult_day_win boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_wins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_training_wins" ON training_wins;
CREATE POLICY "select_own_training_wins" ON training_wins FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_training_wins" ON training_wins;
CREATE POLICY "insert_own_training_wins" ON training_wins FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_training_wins" ON training_wins;
CREATE POLICY "update_own_wins" ON training_wins FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_training_wins" ON training_wins;
CREATE POLICY "delete_own_training_wins" ON training_wins FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_training_wins_user_date ON training_wins (user_id, date);

-- =========================================================
-- NUTRITION WINS
-- =========================================================
CREATE TABLE IF NOT EXISTS nutrition_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  win_type text,
  difficulty text CHECK (difficulty IN ('no', 'a_little', 'very_difficult')),
  difficult_day_win boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE nutrition_wins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_nutrition_wins" ON nutrition_wins;
CREATE POLICY "select_own_nutrition_wins" ON nutrition_wins FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_nutrition_wins" ON nutrition_wins;
CREATE POLICY "insert_own_nutrition_wins" ON nutrition_wins FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_nutrition_wins" ON nutrition_wins;
CREATE POLICY "update_own_nutrition_wins" ON nutrition_wins FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_nutrition_wins" ON nutrition_wins;
CREATE POLICY "delete_own_nutrition_wins" ON nutrition_wins FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_wins_user_date ON nutrition_wins (user_id, date);

-- =========================================================
-- TOOLKIT CATEGORIES
-- =========================================================
CREATE TABLE IF NOT EXISTS toolkit_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE toolkit_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_toolkit_categories" ON toolkit_categories;
CREATE POLICY "select_own_toolkit_categories" ON toolkit_categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_toolkit_categories" ON toolkit_categories;
CREATE POLICY "insert_own_toolkit_categories" ON toolkit_categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_toolkit_categories" ON toolkit_categories;
CREATE POLICY "update_own_toolkit_categories" ON toolkit_categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_toolkit_categories" ON toolkit_categories;
CREATE POLICY "delete_own_toolkit_categories" ON toolkit_categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- TOOLKIT ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS toolkit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES toolkit_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE toolkit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_toolkit_items" ON toolkit_items;
CREATE POLICY "select_own_toolkit_items" ON toolkit_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_toolkit_items" ON toolkit_items;
CREATE POLICY "insert_own_toolkit_items" ON toolkit_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_toolkit_items" ON toolkit_items;
CREATE POLICY "update_own_toolkit_items" ON toolkit_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_toolkit_items" ON toolkit_items;
CREATE POLICY "delete_own_toolkit_items" ON toolkit_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- TOOLKIT FILES (metadata; actual file in Supabase Storage)
-- =========================================================
CREATE TABLE IF NOT EXISTS toolkit_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES toolkit_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE toolkit_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_toolkit_files" ON toolkit_files;
CREATE POLICY "select_own_toolkit_files" ON toolkit_files FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_toolkit_files" ON toolkit_files;
CREATE POLICY "insert_own_toolkit_files" ON toolkit_files FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_toolkit_files" ON toolkit_files;
CREATE POLICY "update_own_toolkit_files" ON toolkit_files FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_toolkit_files" ON toolkit_files;
CREATE POLICY "delete_own_toolkit_files" ON toolkit_files FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- MONTHLY GOALS
-- =========================================================
CREATE TABLE IF NOT EXISTS monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  training_goal int CHECK (training_goal >= 0 AND training_goal <= 100),
  nutrition_goal int CHECK (nutrition_goal >= 0 AND nutrition_goal <= 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);

ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_monthly_goals" ON monthly_goals;
CREATE POLICY "select_own_monthly_goals" ON monthly_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_monthly_goals" ON monthly_goals;
CREATE POLICY "insert_own_monthly_goals" ON monthly_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_monthly_goals" ON monthly_goals;
CREATE POLICY "update_own_monthly_goals" ON monthly_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_monthly_goals" ON monthly_goals;
CREATE POLICY "delete_own_monthly_goals" ON monthly_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- INTEGRATION SETTINGS (placeholder for future integrations)
-- =========================================================
CREATE TABLE IF NOT EXISTS integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, integration_key)
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_integration_settings" ON integration_settings;
CREATE POLICY "select_own_integration_settings" ON integration_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_integration_settings" ON integration_settings;
CREATE POLICY "insert_own_integration_settings" ON integration_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_integration_settings" ON integration_settings;
CREATE POLICY "update_own_integration_settings" ON integration_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_integration_settings" ON integration_settings;
CREATE POLICY "delete_own_integration_settings" ON integration_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- STORAGE BUCKET for toolkit files
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('toolkit_files', 'toolkit_files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own toolkit files" ON storage.objects;
CREATE POLICY "Users can upload own toolkit files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'toolkit_files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own toolkit files" ON storage.objects;
CREATE POLICY "Users can read own toolkit files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'toolkit_files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own toolkit files" ON storage.objects;
CREATE POLICY "Users can delete own toolkit files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'toolkit_files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- updated_at trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_logs_updated_at ON daily_logs;
CREATE TRIGGER trg_daily_logs_updated_at BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_integration_settings_updated_at ON integration_settings;
CREATE TRIGGER trg_integration_settings_updated_at BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
