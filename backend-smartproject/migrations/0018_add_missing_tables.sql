-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Daily Progress Table
CREATE TABLE IF NOT EXISTS daily_progress (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  main_category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  activity TEXT NOT NULL,
  task TEXT NOT NULL,
  task_completion INTEGER NOT NULL,
  activity_completion INTEGER NOT NULL,
  resources_deployed TEXT[] NOT NULL,
  obstruction TEXT NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Resource Plans Table
CREATE TABLE IF NOT EXISTS resource_plans (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'Planned' NOT NULL,
  remarks TEXT,
  created_by TEXT DEFAULT 'System' NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Project Collaboration Threads Table
CREATE TABLE IF NOT EXISTS project_collaboration_threads (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Project Collaboration Messages Table
CREATE TABLE IF NOT EXISTS project_collaboration_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES project_collaboration_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Project Tasks Table
CREATE TABLE IF NOT EXISTS project_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id INTEGER NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  global_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER,
  status TEXT DEFAULT 'pending' NOT NULL,
  remarks TEXT,
  planned_date DATE,
  closed_date DATE,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Project Resources Table
CREATE TABLE IF NOT EXISTS project_resources (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wp_id INTEGER NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  global_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  unit_rate NUMERIC(12, 2) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  remarks TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);
