-- Fix existing work package codes to follow WBS code pattern
-- This script updates all work packages to have codes in the format: {wbs_code}.{sequential_index}

-- Step 1: Update work package codes based on their WBS parent codes
-- Use a subquery with ROW_NUMBER to assign sequential indices
WITH numbered_wps AS (
    SELECT 
        wp.id,
        wp.wbs_item_id,
        wp.project_id,
        wbs.code as wbs_code,
        ROW_NUMBER() OVER (PARTITION BY wp.wbs_item_id ORDER BY wp.id) as seq_num
    FROM work_packages wp
    INNER JOIN wbs_items wbs ON wbs.id = wp.wbs_item_id
)
UPDATE work_packages wp
SET code = CONCAT(nw.wbs_code, '.', nw.seq_num)
FROM numbered_wps nw
WHERE wp.id = nw.id
AND (wp.code LIKE 'WP-%' OR wp.code NOT LIKE '%.%' OR wp.code IS NULL);

-- Step 2: Add the unique constraint
-- Drop the index if it exists (in case of previous failed attempts)
DROP INDEX IF EXISTS "work_packages_project_id_code_unique";

-- Create the unique index
CREATE UNIQUE INDEX "work_packages_project_id_code_unique" ON "work_packages" ("project_id", "code");

