CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_manufacturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"category" text NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"display_name" text,
	"description" text,
	"file_size" integer,
	"content_type" text,
	"b2_file_id" text,
	"uploaded_by_id" integer,
	"uploaded_by_name" text NOT NULL,
	"uploaded_by_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"column" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nationalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_activity_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"predecessor_id" integer NOT NULL,
	"successor_id" integer NOT NULL,
	"type" text NOT NULL,
	"lag" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipment_number" text NOT NULL,
	"equipment_name" text NOT NULL,
	"equipment_type" text NOT NULL,
	"description" text,
	"manufacturer" text,
	"model" text,
	"year" integer,
	"capacity" numeric(12, 2),
	"unit" text,
	"cost_per_hour" numeric(12, 2) NOT NULL,
	"vendor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rental_equipment_equipment_number_unique" UNIQUE("equipment_number")
);
--> statement-breakpoint
CREATE TABLE "rental_manpower" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_number" text NOT NULL,
	"emp_first_name" text NOT NULL,
	"emp_middle_name" text,
	"emp_last_name" text NOT NULL,
	"emp_national_id" text NOT NULL,
	"emp_nationality" text NOT NULL,
	"emp_dob" date NOT NULL,
	"emp_position" text NOT NULL,
	"emp_title" text NOT NULL,
	"emp_trade" text NOT NULL,
	"emp_grade" text NOT NULL,
	"emp_gender" text DEFAULT 'M' NOT NULL,
	"entry_date" date DEFAULT now() NOT NULL,
	"exit_date" date,
	"vendor_id" integer NOT NULL,
	"emp_cost_per_hour" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rental_manpower_employee_number_unique" UNIQUE("employee_number"),
	CONSTRAINT "rental_manpower_emp_national_id_unique" UNIQUE("emp_national_id")
);
--> statement-breakpoint
CREATE TABLE "service_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_code" text NOT NULL,
	"service_description" text NOT NULL,
	"uom" text NOT NULL,
	"service_type" text NOT NULL,
	"service_group" text NOT NULL,
	"base_rate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_master_service_code_unique" UNIQUE("service_code")
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uoms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_package_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"wp_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"estimated_value" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_package_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"wp_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"estimated_value" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_master" ADD COLUMN "emp_gender" text DEFAULT 'M' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_master" ADD COLUMN "entry_date" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_master" ADD COLUMN "exit_date" date;--> statement-breakpoint
ALTER TABLE "equipment_master" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "material_master" ADD COLUMN "base_rate" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_activities" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "allocation_version" integer;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_dependencies" ADD CONSTRAINT "project_activity_dependencies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_dependencies" ADD CONSTRAINT "project_activity_dependencies_predecessor_id_project_activities_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."project_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_dependencies" ADD CONSTRAINT "project_activity_dependencies_successor_id_project_activities_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."project_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_equipment" ADD CONSTRAINT "rental_equipment_vendor_id_vendor_master_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_manpower" ADD CONSTRAINT "rental_manpower_vendor_id_vendor_master_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_package_materials" ADD CONSTRAINT "work_package_materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_package_materials" ADD CONSTRAINT "work_package_materials_wp_id_work_packages_id_fk" FOREIGN KEY ("wp_id") REFERENCES "public"."work_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_package_materials" ADD CONSTRAINT "work_package_materials_material_id_material_master_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."material_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_package_services" ADD CONSTRAINT "work_package_services_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_package_services" ADD CONSTRAINT "work_package_services_wp_id_work_packages_id_fk" FOREIGN KEY ("wp_id") REFERENCES "public"."work_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_package_services" ADD CONSTRAINT "work_package_services_service_id_service_master_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "end_date";