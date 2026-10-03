/*
# Add custom actions, rewards, and cycle tracking tables

## Overview
Adds 5 new tables to support custom positive actions, reward milestones,
reward claims, and menstrual cycle tracking. All tables use the same
owner-scoped RLS pattern as existing tables.

## New Tables
1. `custom_actions` — user-defined positive actions (e.g. "I went for a walk")
   - id, user_id, title, emoji, category, active, display_order, counts_as_win
2. `custom_action_logs` — one record per tap of a custom action
   - id, user_id, action_id, date, difficult_day_win, created_at
3. `rewards` — user-defined reward milestones
   - id, user_id, title, emoji, description, milestone, active
4. `reward_claims` — tracks when a reward was claimed
   - id, user_id, reward_id, claimed_at, win_count_at_claim
5. `cycle_logs` — menstrual cycle tracking entries
   - id, user_id, period_start_date, cycle_length, period_length, notes

## Security
- RLS enabled on ALL new tables.
- Every table has user_id NOT NULL DEFAULT auth.uid().
- 4 CRUD policies per table, scoped TO authenticated with auth.uid() = user_id.

## Notes
- custom_actions.counts_as_win defaults true — most actions count as wins.
- custom_action_logs.difficult_day_win is set when the day's daily_state = 'hard'.
- reward_claims.win_count_at_claim records the lifetime win count at claim time.
- cycle_logs uses period_start_date (not just date) to allow tracking cycle start.
*/

-- =========================================================
-- CUSTOM ACTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS custom_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '✨',
  category text,
  active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  counts_as_win boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_custom_actions" ON custom_actions;
CREATE POLICY "select_own_custom_actions" ON custom_actions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_custom_actions" ON custom_actions;
CREATE POLICY "insert_own_custom_actions" ON custom_actions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_custom_actions" ON custom_actions;
CREATE POLICY "update_own_custom_actions" ON custom_actions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_custom_actions" ON custom_actions;
CREATE POLICY "delete_own_custom_actions" ON custom_actions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_custom_actions_user ON custom_actions (user_id, display_order);

-- =========================================================
-- CUSTOM ACTION LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS custom_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES custom_actions(id) ON DELETE CASCADE,
  date date NOT NULL,
  difficult_day_win boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_custom_action_logs" ON custom_action_logs;
CREATE POLICY "select_own_custom_action_logs" ON custom_action_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_custom_action_logs" ON custom_action_logs;
CREATE POLICY "insert_own_custom_action_logs" ON custom_action_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_custom_action_logs" ON custom_action_logs;
CREATE POLICY "update_own_custom_action_logs" ON custom_action_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_custom_action_logs" ON custom_action_logs;
CREATE POLICY "delete_own_custom_action_logs" ON custom_action_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_custom_action_logs_user_date ON custom_action_logs (user_id, date);

-- =========================================================
-- REWARDS
-- =========================================================
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  description text,
  milestone int NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rewards" ON rewards;
CREATE POLICY "select_own_rewards" ON rewards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_rewards" ON rewards;
CREATE POLICY "insert_own_rewards" ON rewards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rewards" ON rewards;
CREATE POLICY "update_own_rewards" ON rewards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rewards" ON rewards;
CREATE POLICY "delete_own_rewards" ON rewards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards (user_id, milestone);

-- =========================================================
-- REWARD CLAIMS
-- =========================================================
CREATE TABLE IF NOT EXISTS reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  win_count_at_claim int NOT NULL DEFAULT 0
);

ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reward_claims" ON reward_claims;
CREATE POLICY "select_own_reward_claims" ON reward_claims FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reward_claims" ON reward_claims;
CREATE POLICY "insert_own_reward_claims" ON reward_claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reward_claims" ON reward_claims;
CREATE POLICY "update_own_reward_claims" ON reward_claims FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reward_claims" ON reward_claims;
CREATE POLICY "delete_own_reward_claims" ON reward_claims FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON reward_claims (user_id);

-- =========================================================
-- CYCLE LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start_date date NOT NULL,
  cycle_length int CHECK (cycle_length >= 1 AND cycle_length <= 60),
  period_length int CHECK (period_length >= 1 AND period_length <= 14),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cycle_logs" ON cycle_logs;
CREATE POLICY "select_own_cycle_logs" ON cycle_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cycle_logs" ON cycle_logs;
CREATE POLICY "insert_own_cycle_logs" ON cycle_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cycle_logs" ON cycle_logs;
CREATE POLICY "update_own_cycle_logs" ON cycle_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cycle_logs" ON cycle_logs;
CREATE POLICY "delete_own_cycle_logs" ON cycle_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cycle_logs_user ON cycle_logs (user_id, period_start_date);
