/*
# Create app_config table for storing VAPID keys and other app-wide settings

1. New Tables
- `app_config`
  - `key` (text, primary key) — configuration key name
  - `value` (text, not null) — configuration value
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `app_config`.
- No client access — only the service role (edge functions) can read/write.
- All policies are deny-by-default (no SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated).
*/

CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Insert VAPID keys
INSERT INTO app_config (key, value) VALUES
  ('vapid_public_key', 'BKD3bxOTmim5fTBz_O50OLAAWWJ7AI7QNQPFW3KApjMErosceBlwhQ9uRE0ikBzcfbAhox2QEWzHsNGAtBDQ4IU'),
  ('vapid_private_key', 'b1Aq2Fvi-1AS_u4N4M3fUqVBFJknvN2f8z7UmFG2yTI'),
  ('vapid_subject', 'mailto:noreply@myrhythm.app')
ON CONFLICT (key) DO NOTHING;
