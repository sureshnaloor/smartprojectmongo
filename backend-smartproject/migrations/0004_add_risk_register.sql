-- Create risk_register table
CREATE TABLE IF NOT EXISTS "risk_register" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "date_logged" date NOT NULL,
  "risk" text NOT NULL,
  "risk_type" text NOT NULL,
  "probability" text NOT NULL,
  "impact" text NOT NULL,
  "user_logged" text NOT NULL,
  "action_taken" text NOT NULL,
  "remarks" text,
  "status" text DEFAULT 'Open' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "risk_register" ADD CONSTRAINT "risk_register_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;




