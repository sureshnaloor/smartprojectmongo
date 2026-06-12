-- Create indirect_manpower_positions table
CREATE TABLE IF NOT EXISTS "indirect_manpower_positions" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "position_id" text NOT NULL,
  "name" text NOT NULL,
  "order" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indirect_manpower_entries table
CREATE TABLE IF NOT EXISTS "indirect_manpower_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "date" date NOT NULL,
  "positions" text NOT NULL,
  "total_overhead" numeric(10, 2) NOT NULL,
  "remarks" text,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "indirect_manpower_positions" ADD CONSTRAINT "indirect_manpower_positions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "indirect_manpower_entries" ADD CONSTRAINT "indirect_manpower_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;




