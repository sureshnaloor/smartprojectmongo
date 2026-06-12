-- Change default status for global tasks to 'active'
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'active';

-- Update existing tasks to 'active' status
UPDATE "tasks" SET "status" = 'active' WHERE "status" = 'pending';
