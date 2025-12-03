// Database schema for Inventory Management
// SQLite tables for Location, Item, ItemHistory, and User

export const CREATE_TABLES = `
-- Location table (unlimited depth hierarchy)
CREATE TABLE IF NOT EXISTS Location (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  full_path TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  is_transit INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES Location(id)
);

-- Item table (inventory items)
CREATE TABLE IF NOT EXISTS Item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_number TEXT UNIQUE NOT NULL,
  description TEXT,
  customer_name TEXT,
  status TEXT NOT NULL CHECK(status IN ('Collected', 'In transit', 'In storage', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
  current_location_id INTEGER NOT NULL,
  current_location_path TEXT,
  notes TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (current_location_id) REFERENCES Location(id)
);

-- ItemHistory table (audit log - append only)
CREATE TABLE IF NOT EXISTS ItemHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  user_name TEXT,
  action_type TEXT NOT NULL CHECK(action_type IN ('COLLECTED', 'MOVED', 'STATUS_CHANGE', 'PACKED', 'SHIPPED', 'DELIVERED', 'NOTE')),
  from_location_path TEXT,
  to_location_path TEXT,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  device_id TEXT,
  FOREIGN KEY (item_id) REFERENCES Item(id),
  FOREIGN KEY (user_id) REFERENCES User(id)
);

-- User table (authentication and permissions)
CREATE TABLE IF NOT EXISTS User (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_location_parent ON Location(parent_id);
CREATE INDEX IF NOT EXISTS idx_location_is_transit ON Location(is_transit);
CREATE INDEX IF NOT EXISTS idx_location_is_active ON Location(is_active);
CREATE INDEX IF NOT EXISTS idx_item_inventory_number ON Item(inventory_number);
CREATE INDEX IF NOT EXISTS idx_item_location ON Item(current_location_id);
CREATE INDEX IF NOT EXISTS idx_item_status ON Item(status);
CREATE INDEX IF NOT EXISTS idx_item_archived ON Item(is_archived);
CREATE INDEX IF NOT EXISTS idx_history_item ON ItemHistory(item_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON ItemHistory(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_username ON User(username);
`;

export const SEED_INITIAL_DATA = `
-- Create default admin user (password: admin)
-- Password hash is a simple hash of "admin" - replace with bcrypt in production
INSERT OR IGNORE INTO User (id, username, password_hash, role)
VALUES (1, 'admin', 'admin', 'admin');

-- Create Warehouse 1
INSERT OR IGNORE INTO Location (id, name, parent_id, full_path, level, is_transit, is_active)
VALUES (1, 'Warehouse 1', NULL, 'Warehouse 1', 0, 0, 1);

-- Create Transit Room in Warehouse 1
INSERT OR IGNORE INTO Location (id, name, parent_id, full_path, level, is_transit, is_active)
VALUES (2, 'Transit Room', 1, 'Warehouse 1 / Transit Room', 1, 1, 1);
`;
