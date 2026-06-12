-- Service Type (for Service Master)
CREATE TABLE IF NOT EXISTS service_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Service Group (for Service Master)
CREATE TABLE IF NOT EXISTS service_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Service Master (all services are outsourced)
CREATE TABLE IF NOT EXISTS service_master (
  id SERIAL PRIMARY KEY,
  service_code TEXT NOT NULL UNIQUE,
  service_description TEXT NOT NULL,
  uom TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_group TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_master_service_code ON service_master(service_code);
