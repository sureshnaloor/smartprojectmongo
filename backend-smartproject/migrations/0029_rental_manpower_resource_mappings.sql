-- Maps rental manpower master rows to rental_manpower type global resources (one-to-one)
CREATE TABLE IF NOT EXISTS rental_manpower_resource_mappings (
  id SERIAL PRIMARY KEY,
  rental_manpower_id INTEGER NOT NULL UNIQUE,
  resource_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (rental_manpower_id) REFERENCES rental_manpower(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rental_manpower_resource_mappings_resource_id
ON rental_manpower_resource_mappings(resource_id);
