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