CREATE TABLE IF NOT EXISTS "resource_timesheets" (
  "id" serial PRIMARY KEY NOT NULL,
  "date" date NOT NULL,
  "resource_type" text NOT NULL,
  "employee_id" integer,
  "rental_manpower_id" integer,
  "equipment_id" integer,
  "rental_equipment_id" integer,
  "tool_id" integer,
  "status" text NOT NULL,
  "project_id" integer,
  "wp_id" integer,
  "entered_by" text NOT NULL,
  "entered_date" timestamp DEFAULT now() NOT NULL,
  "remarks" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_employee_id_employee_master_id_fk"
  FOREIGN KEY ("employee_id") REFERENCES "public"."employee_master"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_rental_manpower_id_rental_manpower_id_fk"
  FOREIGN KEY ("rental_manpower_id") REFERENCES "public"."rental_manpower"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_equipment_id_equipment_master_id_fk"
  FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment_master"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_rental_equipment_id_rental_equipment_id_fk"
  FOREIGN KEY ("rental_equipment_id") REFERENCES "public"."rental_equipment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_tool_id_tool_master_id_fk"
  FOREIGN KEY ("tool_id") REFERENCES "public"."tool_master"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "resource_timesheets"
  ADD CONSTRAINT "resource_timesheets_wp_id_work_packages_id_fk"
  FOREIGN KEY ("wp_id") REFERENCES "public"."work_packages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "resource_timesheets_date_idx" ON "resource_timesheets" ("date");
CREATE INDEX IF NOT EXISTS "resource_timesheets_resource_type_idx" ON "resource_timesheets" ("resource_type");
CREATE INDEX IF NOT EXISTS "resource_timesheets_project_id_idx" ON "resource_timesheets" ("project_id");
