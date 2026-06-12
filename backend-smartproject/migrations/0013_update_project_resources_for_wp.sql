-- Update project_resources table to add wp_id and date fields
-- Step 1: Add wp_id column (make it nullable first, then we'll update existing records)
ALTER TABLE "project_resources" 
ADD COLUMN IF NOT EXISTS "wp_id" integer;

-- Step 2: Add date columns for planned dates
ALTER TABLE "project_resources" 
ADD COLUMN IF NOT EXISTS "planned_start_date" date,
ADD COLUMN IF NOT EXISTS "planned_end_date" date;

-- Step 3: Add foreign key constraint for wp_id
ALTER TABLE "project_resources" 
ADD CONSTRAINT "project_resources_wp_id_work_packages_id_fk" 
FOREIGN KEY ("wp_id") REFERENCES "work_packages"("id") ON DELETE cascade ON UPDATE no action;

-- Step 4: Make wp_id NOT NULL (after handling existing data)
-- Note: This will fail if there are existing records without wp_id
-- Uncomment after ensuring all existing records have wp_id assigned
-- ALTER TABLE "project_resources" ALTER COLUMN "wp_id" SET NOT NULL;

