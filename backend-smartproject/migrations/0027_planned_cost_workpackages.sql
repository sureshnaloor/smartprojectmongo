-- Planned cost snapshot per work package
CREATE TABLE IF NOT EXISTS planned_cost_workpackages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wp_id INTEGER NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  materials_planned_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  services_planned_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  resources_planned_value NUMERIC(12,  2) NOT NULL DEFAULT 0,
  total_planned_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_planned_cost_wp_project_id ON planned_cost_workpackages(project_id);
CREATE INDEX IF NOT EXISTS idx_planned_cost_wp_wp_id ON planned_cost_workpackages(wp_id);

