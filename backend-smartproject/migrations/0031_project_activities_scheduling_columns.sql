-- project_activities: CPM / scheduling day-offset and float columns (see schema.ts projectActivities)
-- Safe to run if some columns already exist (PostgreSQL 11+).

ALTER TABLE project_activities
  ADD COLUMN IF NOT EXISTS early_start_day INTEGER,
  ADD COLUMN IF NOT EXISTS early_finish_day INTEGER,
  ADD COLUMN IF NOT EXISTS late_start_day INTEGER,
  ADD COLUMN IF NOT EXISTS late_finish_day INTEGER,
  ADD COLUMN IF NOT EXISTS total_float_days INTEGER;
