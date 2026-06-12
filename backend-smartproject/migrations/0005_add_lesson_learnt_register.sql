-- Create lesson_learnt_register table
CREATE TABLE IF NOT EXISTS "lesson_learnt_register" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "category" text NOT NULL,
  "lesson" text NOT NULL,
  "type" text NOT NULL,
  "date_logged" date NOT NULL,
  "logged_by" text NOT NULL,
  "documents" text[] DEFAULT ARRAY[]::text[],
  "status" text DEFAULT 'Open' NOT NULL,
  "impact" text NOT NULL,
  "priority" text NOT NULL,
  "description" text NOT NULL,
  "recommendations" text NOT NULL,
  "actions_taken" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "lesson_learnt_register" ADD CONSTRAINT "lesson_learnt_register_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;




