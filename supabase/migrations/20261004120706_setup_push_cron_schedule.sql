/*
# Set up cron schedule for daily push notification check

1. Purpose
- Creates a cron job that calls the `push-daily-checkin` edge function every hour.
- The edge function checks each user's configured checkin_time and only sends
  if the current UTC time has passed that threshold AND the user hasn't already
  been notified today. Hourly runs are safe — users only get one push per day.

2. Implementation
- Uses `pg_cron` and `pg_net` extensions.
- Sends an HTTP POST to the edge function with no body to trigger all-user processing.

3. Security
- No new tables or RLS changes.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'push-daily-checkin-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://tmwylekvkadvdxliwntb.supabase.co/functions/v1/push-daily-checkin',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtd3lsZWt2a2FkdmR4bGl3bnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NTYzMTIsImV4cCI6MjEwNjQzMjMxMn0.5V_l4MkAw8zwzOgo02HD33lI2MQvSKA0S4fh3hBEsAI'
      ),
      body := '{}'::jsonb
    );
  $$
);
