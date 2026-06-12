-- Equipment Master Table
CREATE TABLE IF NOT EXISTS equipment_master (
  id SERIAL PRIMARY KEY,
  equipment_number TEXT NOT NULL UNIQUE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  model TEXT,
  capacity NUMERIC(12, 2),
  unit TEXT,
  cost_per_hour NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'Active',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_master_equipment_number 
ON equipment_master(equipment_number);
