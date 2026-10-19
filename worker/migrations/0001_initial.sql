PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO store_settings (id, value_json, updated_at) VALUES (
  1,
  '{"pricingMode":"percent","profitValue":20,"packagingCost":30,"deliveryInsideDhaka":80,"deliveryOutsideDhaka":130,"paymentInstructions":"","storeName":"Daily Deals BD"}',
  datetime('now')
);

CREATE TABLE IF NOT EXISTS product_pricing (
  product_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('percent','fixed','custom')),
  value REAL NOT NULL DEFAULT 0,
  custom_price REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_uid TEXT,
  customer_email TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_division TEXT NOT NULL,
  customer_district TEXT NOT NULL,
  customer_area TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL CHECK (delivery_zone IN ('dhaka_city','outside_dhaka_city')),
  customer_note TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  delivery_charge REAL NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT NOT NULL DEFAULT '',
  payment_status TEXT NOT NULL DEFAULT 'not_required',
  status TEXT NOT NULL DEFAULT 'pending_review',
  is_merged INTEGER NOT NULL DEFAULT 0,
  merged_into TEXT,
  source_order_ids_json TEXT NOT NULL DEFAULT '[]',
  business_submission_json TEXT NOT NULL DEFAULT '{}',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_uid_idx ON orders(customer_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, merged_into);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone, created_at DESC);

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
