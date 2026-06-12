CREATE TABLE IF NOT EXISTS "tool_master" (
  "id" serial PRIMARY KEY NOT NULL,
  "tool_number" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "brand" text,
  "model" text,
  "unit_of_measure" text NOT NULL,
  "accessories" text,
  "unit_rate" numeric(12, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tool_resource_mappings" (
  "id" serial PRIMARY KEY NOT NULL,
  "tool_id" integer NOT NULL UNIQUE REFERENCES "tool_master"("id") ON DELETE CASCADE,
  "resource_id" integer NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
