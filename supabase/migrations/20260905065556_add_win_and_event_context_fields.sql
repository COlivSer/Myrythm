/*
# Add context fields to wins and events

## Overview
Adds optional helping_factors and notes columns to training_wins and nutrition_wins,
and optional context fields (suspected_reason, what_might_have_helped, notes) to events.
These support richer optional context logging without forcing the user to fill them in.

## Modified Tables
1. `training_wins` — add `helping_factors jsonb DEFAULT '[]'`, `notes text`
2. `nutrition_wins` — add `helping_factors jsonb DEFAULT '[]'`, `notes text`
3. `events` — add `suspected_reason text`, `what_might_have_helped text`, `notes text`

## Security
- No policy changes needed; existing RLS policies cover new columns.
- All new columns are nullable / have defaults so existing rows are unaffected.

## Notes
- helping_factors stored as jsonb array of strings (e.g. ["Buddy", "Music"])
- All fields optional; missing values never interpreted as negative.
*/

ALTER TABLE training_wins
  ADD COLUMN IF NOT EXISTS helping_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE nutrition_wins
  ADD COLUMN IF NOT EXISTS helping_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS suspected_reason text,
  ADD COLUMN IF NOT EXISTS what_might_have_helped text,
  ADD COLUMN IF NOT EXISTS notes text;
