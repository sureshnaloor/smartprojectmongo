-- Equipment Resource Mapping Table
-- Maps equipment to equipment type resources (one-to-one relationship)
CREATE TABLE IF NOT EXISTS equipment_resource_mappings (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL UNIQUE,
  resource_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment_master(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- Create index on resource_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_resource_mappings_resource_id 
ON equipment_resource_mappings(resource_id);
