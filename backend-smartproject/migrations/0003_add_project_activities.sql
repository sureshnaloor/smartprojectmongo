-- Create project_activities table
CREATE TABLE IF NOT EXISTS "project_activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "global_activity_id" integer,
  "name" text NOT NULL,
  "description" text,
  "unit_of_measure" text NOT NULL,
  "unit_rate" numeric(12, 2) NOT NULL,
  "quantity" numeric(12, 2) NOT NULL,
  "remarks" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_global_activity_id_activities_id_fk" FOREIGN KEY ("global_activity_id") REFERENCES "activities"("id") ON DELETE set null ON UPDATE no action;
