-- Update project_tasks table to add activity_id and date fields
-- Step 1: Add activity_id column (make it nullable first, then we'll update existing records)
ALTER TABLE "project_tasks" 
ADD COLUMN IF NOT EXISTS "activity_id" integer;

-- Step 2: Add date columns
ALTER TABLE "project_tasks" 
ADD COLUMN IF NOT EXISTS "planned_date" date,
ADD COLUMN IF NOT EXISTS "closed_date" date;

-- Step 3: Add foreign key constraint for activity_id
ALTER TABLE "project_tasks" 
ADD CONSTRAINT "project_tasks_activity_id_project_activities_id_fk" 
FOREIGN KEY ("activity_id") REFERENCES "project_activities"("id") ON DELETE cascade ON UPDATE no action;

-- Step 4: Make activity_id NOT NULL (after handling existing data)
-- Note: This will fail if there are existing records without activity_id
-- Uncomment after ensuring all existing records have activity_id assigned
-- ALTER TABLE "project_tasks" ALTER COLUMN "activity_id" SET NOT NULL;

