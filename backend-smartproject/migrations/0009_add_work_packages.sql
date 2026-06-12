-- Create work_packages table
CREATE TABLE IF NOT EXISTS "work_packages" (
  "id" serial PRIMARY KEY NOT NULL,
  "wbs_item_id" integer NOT NULL,
  "project_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "code" text NOT NULL,
  "budgeted_cost" numeric(12, 2) NOT NULL,
  "actual_cost" numeric(12, 2) DEFAULT '0',
  "percent_complete" numeric(5, 2) DEFAULT '0',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_wbs_item_id_wbs_items_id_fk" FOREIGN KEY ("wbs_item_id") REFERENCES "wbs_items"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;

-- Add unique constraint: code must be unique within a project
CREATE UNIQUE INDEX IF NOT EXISTS "work_packages_project_id_code_unique" ON "work_packages" ("project_id", "code");

