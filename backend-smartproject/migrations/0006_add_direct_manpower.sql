-- Create direct_manpower_positions table
CREATE TABLE IF NOT EXISTS "direct_manpower_positions" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "position_id" text NOT NULL,
  "name" text NOT NULL,
  "order" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create direct_manpower_entries table
CREATE TABLE IF NOT EXISTS "direct_manpower_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "date" date NOT NULL,
  "positions" text NOT NULL,
  "total_manpower" integer NOT NULL,
  "remarks" text,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "direct_manpower_positions" ADD CONSTRAINT "direct_manpower_positions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "direct_manpower_entries" ADD CONSTRAINT "direct_manpower_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;




