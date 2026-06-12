-- Add base_rate (unit rate per UOM) to material_master and service_master for estimated value in work packages
ALTER TABLE material_master
  ADD COLUMN IF NOT EXISTS base_rate NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE service_master
  ADD COLUMN IF NOT EXISTS base_rate NUMERIC(12, 2) NOT NULL DEFAULT 0;
