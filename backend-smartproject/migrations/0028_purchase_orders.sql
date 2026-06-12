-- Purchase Orders header table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  po_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Purchase Order line items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_type TEXT NOT NULL, -- 'material' or 'service'
  item_description TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_project_id ON purchase_order_items(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_wp_id ON purchase_order_items(wp_id);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_order_items_po_id_line_number_unique
  ON purchase_order_items(po_id, line_number);

