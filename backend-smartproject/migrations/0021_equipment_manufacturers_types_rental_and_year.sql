-- Equipment Manufacturers (OEM)
CREATE TABLE IF NOT EXISTS equipment_manufacturers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Equipment Types
CREATE TABLE IF NOT EXISTS equipment_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add year column to equipment_master
ALTER TABLE equipment_master ADD COLUMN IF NOT EXISTS year INTEGER;

-- Rental Equipment
CREATE TABLE IF NOT EXISTS rental_equipment (
  id SERIAL PRIMARY KEY,
  equipment_number TEXT NOT NULL UNIQUE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  model TEXT,
  year INTEGER,
  capacity NUMERIC(12, 2),
  unit TEXT,
  cost_per_hour NUMERIC(12, 2) NOT NULL,
  vendor_id INTEGER NOT NULL REFERENCES vendor_master(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rental_equipment_equipment_number ON rental_equipment(equipment_number);
CREATE INDEX IF NOT EXISTS idx_rental_equipment_vendor_id ON rental_equipment(vendor_id);
