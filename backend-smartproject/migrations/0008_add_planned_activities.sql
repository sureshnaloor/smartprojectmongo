-- Create planned_activities table
CREATE TABLE IF NOT EXISTS "planned_activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "status" text NOT NULL,
  "priority" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "assigned_to" text NOT NULL,
  "remarks" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create planned_activity_tasks table
CREATE TABLE IF NOT EXISTS "planned_activity_tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "activity_id" integer NOT NULL,
  "name" text NOT NULL,
  "status" text NOT NULL,
  "priority" text NOT NULL,
  "assigned_to" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "remarks" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "planned_activities" ADD CONSTRAINT "planned_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "planned_activity_tasks" ADD CONSTRAINT "planned_activity_tasks_activity_id_planned_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "planned_activities"("id") ON DELETE cascade ON UPDATE no action;




