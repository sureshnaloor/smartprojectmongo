-- Material Master Table
CREATE TABLE IF NOT EXISTS material_master (
  id SERIAL PRIMARY KEY,
  material_code TEXT NOT NULL UNIQUE,
  material_description TEXT NOT NULL,
  uom TEXT NOT NULL,
  material_type TEXT NOT NULL,
  material_group TEXT NOT NULL,
  material_class TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vendor Master Table
CREATE TABLE IF NOT EXISTS vendor_master (
  id SERIAL PRIMARY KEY,
  vendor_code TEXT NOT NULL UNIQUE,
  vendor_name TEXT NOT NULL,
  vendor_address TEXT NOT NULL,
  vendor_city TEXT NOT NULL,
  vendor_country TEXT NOT NULL,
  vendor_zip_code TEXT NOT NULL,
  vendor_email TEXT NOT NULL,
  vendor_telephone TEXT NOT NULL,
  vendor_fax TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employee Master Table
CREATE TABLE IF NOT EXISTS employee_master (
  id SERIAL PRIMARY KEY,
  employee_number TEXT NOT NULL UNIQUE,
  emp_first_name TEXT NOT NULL,
  emp_middle_name TEXT,
  emp_last_name TEXT NOT NULL,
  emp_national_id TEXT NOT NULL UNIQUE,
  emp_nationality TEXT NOT NULL,
  emp_dob DATE NOT NULL,
  emp_position TEXT NOT NULL,
  emp_title TEXT NOT NULL,
  emp_trade TEXT NOT NULL,
  emp_grade TEXT NOT NULL,
  emp_cost_per_hour NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_material_code ON material_master(material_code);
CREATE INDEX idx_vendor_code ON vendor_master(vendor_code);
CREATE INDEX idx_employee_number ON employee_master(employee_number);
