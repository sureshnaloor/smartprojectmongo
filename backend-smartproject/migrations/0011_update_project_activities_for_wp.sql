-- Update project_activities table to add wp_id and date fields
-- Step 1: Add wp_id column (make it nullable first, then we'll update existing records)
ALTER TABLE "project_activities" 
ADD COLUMN IF NOT EXISTS "wp_id" integer;

-- Step 2: Add date columns
ALTER TABLE "project_activities" 
ADD COLUMN IF NOT EXISTS "planned_from_date" date,
ADD COLUMN IF NOT EXISTS "planned_to_date" date,
ADD COLUMN IF NOT EXISTS "estimated_start_date" date,
ADD COLUMN IF NOT EXISTS "estimated_end_date" date,
ADD COLUMN IF NOT EXISTS "actual_start_date" date,
ADD COLUMN IF NOT EXISTS "actual_to_date" date;

-- Step 3: For existing records, we need to handle them appropriately
-- Since we can't automatically assign wp_id to existing records, we'll leave them nullable for now
-- In production, you may want to delete existing project_activities or assign them to a default WP

-- Step 4: Add foreign key constraint for wp_id
ALTER TABLE "project_activities" 
ADD CONSTRAINT "project_activities_wp_id_work_packages_id_fk" 
FOREIGN KEY ("wp_id") REFERENCES "work_packages"("id") ON DELETE cascade ON UPDATE no action;

-- Step 5: Make wp_id NOT NULL (after handling existing data)
-- Note: This will fail if there are existing records without wp_id
-- Uncomment after ensuring all existing records have wp_id assigned
-- ALTER TABLE "project_activities" ALTER COLUMN "wp_id" SET NOT NULL;

