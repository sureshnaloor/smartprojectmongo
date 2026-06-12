-- Materials and services assigned to work packages (quantity * base_rate = estimated value, consumes WP budget)
CREATE TABLE IF NOT EXISTS work_package_materials (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wp_id INTEGER NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES material_master(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL,
  estimated_value NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS work_package_services (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wp_id INTEGER NOT NULL REFERENCES work_packages(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES service_master(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL,
  estimated_value NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_materials_wp_id ON work_package_materials(wp_id);
CREATE INDEX IF NOT EXISTS idx_wp_materials_project_id ON work_package_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_services_wp_id ON work_package_services(wp_id);
CREATE INDEX IF NOT EXISTS idx_wp_services_project_id ON work_package_services(project_id);
