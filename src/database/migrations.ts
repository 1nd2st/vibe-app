// Database migration system for version control
import * as SQLite from "expo-sqlite";

export interface Migration {
  version: number;
  name: string;
  up: string; // SQL to apply migration
  down?: string; // SQL to rollback (optional)
}

// Migration history
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: `
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Warehouse table for multi-warehouse support (must come before Location)
      CREATE TABLE IF NOT EXISTS Warehouse (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      -- Location table with code support
      CREATE TABLE IF NOT EXISTS Location (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        full_path TEXT NOT NULL,
        code_part TEXT,
        location_code TEXT UNIQUE,
        level INTEGER DEFAULT 0,
        warehouse_id INTEGER,
        is_transit INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (parent_id) REFERENCES Location(id),
        FOREIGN KEY (warehouse_id) REFERENCES Warehouse(id)
      );

      -- User table with enhanced security
      CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        must_change_password INTEGER DEFAULT 0,
        password_changed_at TEXT,
        last_login_at TEXT,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      -- Customer table (must come before Collection and Item)
      CREATE TABLE IF NOT EXISTS Customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      -- Collection table (art collection jobs - must come before Item)
      CREATE TABLE IF NOT EXISTS Collection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        display_id TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        collection_date INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'signed')),
        pickup_address TEXT NOT NULL,
        delivery_address TEXT,
        employee_name TEXT NOT NULL,
        notes TEXT,
        signature_uri TEXT,
        signer_name TEXT,
        signer_role TEXT,
        signature_timestamp INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES Customer(id)
      );

      -- Item table (unified for Collection and Inventory)
      CREATE TABLE IF NOT EXISTS Item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        inventory_number TEXT UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        artist_name TEXT,
        customer_id INTEGER,
        customer_name TEXT,
        collection_id INTEGER,
        status TEXT NOT NULL CHECK(status IN ('Collected', 'In transit', 'In storage', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
        current_location_id INTEGER,
        current_location_path TEXT,
        dimensions_length REAL,
        dimensions_width REAL,
        dimensions_height REAL,
        dimensions_unit TEXT,
        estimated_value REAL,
        currency TEXT,
        overall_condition TEXT,
        condition_notes TEXT,
        notes TEXT,
        is_archived INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (current_location_id) REFERENCES Location(id),
        FOREIGN KEY (collection_id) REFERENCES Collection(id),
        FOREIGN KEY (customer_id) REFERENCES Customer(id),
        FOREIGN KEY (created_by) REFERENCES User(id)
      );

      -- ItemPhoto table
      CREATE TABLE IF NOT EXISTS ItemPhoto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        item_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        condition_notes TEXT,
        ai_detected_damage TEXT,
        ai_analyzed INTEGER DEFAULT 0,
        annotation_data TEXT,
        annotated_uri TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES Item(id) ON DELETE CASCADE
      );

      -- ItemHistory table (append-only audit log)
      CREATE TABLE IF NOT EXISTS ItemHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        user_name TEXT,
        action_type TEXT NOT NULL CHECK(action_type IN ('COLLECTED', 'MOVED', 'STATUS_CHANGE', 'PACKED', 'SHIPPED', 'DELIVERED', 'NOTE', 'PHOTO_ADDED', 'UPDATED')),
        from_location_path TEXT,
        to_location_path TEXT,
        from_status TEXT,
        to_status TEXT,
        notes TEXT,
        device_id TEXT,
        ip_address TEXT,
        app_version TEXT,
        session_id TEXT,
        FOREIGN KEY (item_id) REFERENCES Item(id),
        FOREIGN KEY (user_id) REFERENCES User(id)
      );

      -- UserLocationUsage table (for Quick Access)
      CREATE TABLE IF NOT EXISTS UserLocationUsage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_favorite INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES User(id),
        FOREIGN KEY (location_id) REFERENCES Location(id),
        UNIQUE(user_id, location_id)
      );

      -- PasswordPolicy table
      CREATE TABLE IF NOT EXISTS PasswordPolicy (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        min_length INTEGER DEFAULT 8,
        require_uppercase INTEGER DEFAULT 1,
        require_lowercase INTEGER DEFAULT 1,
        require_number INTEGER DEFAULT 1,
        require_special_char INTEGER DEFAULT 0,
        password_expiry_days INTEGER DEFAULT 90,
        force_change_on_first_login INTEGER DEFAULT 1,
        max_failed_attempts INTEGER DEFAULT 5,
        lockout_duration_minutes INTEGER DEFAULT 30,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- ChangeLog table (audit critical actions)
      CREATE TABLE IF NOT EXISTS ChangeLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        user_id INTEGER,
        user_name TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        app_version TEXT,
        session_id TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES User(id)
      );

      -- LoginAttempt table (security tracking)
      CREATE TABLE IF NOT EXISTS LoginAttempt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        success INTEGER NOT NULL,
        ip_address TEXT,
        device_id TEXT,
        app_version TEXT,
        error_message TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- CustomerLocation table (pickup/delivery locations for customers)
      CREATE TABLE IF NOT EXISTS CustomerLocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('pickup', 'delivery', 'both')),
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE
      );

      -- CollectionItem table (items within a collection)
      CREATE TABLE IF NOT EXISTS CollectionItem (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        display_id TEXT UNIQUE NOT NULL,
        collection_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        artist_name TEXT,
        dimensions_length REAL NOT NULL,
        dimensions_width REAL NOT NULL,
        dimensions_height REAL NOT NULL,
        dimensions_unit TEXT NOT NULL CHECK(dimensions_unit IN ('cm', 'in')),
        weight REAL,
        weight_unit TEXT CHECK(weight_unit IN ('kg', 'lb')),
        estimated_value REAL NOT NULL,
        currency TEXT NOT NULL CHECK(currency IN ('USD', 'EUR', 'GBP')),
        overall_condition TEXT NOT NULL CHECK(overall_condition IN ('Excellent', 'Good', 'Fair', 'Poor', 'Damaged')),
        condition_notes TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (collection_id) REFERENCES Collection(id) ON DELETE CASCADE
      );

      -- CollectionItemPhoto table (photos for collection items)
      CREATE TABLE IF NOT EXISTS CollectionItemPhoto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        collection_item_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        condition_notes TEXT,
        ai_detected_damage TEXT,
        ai_analyzed INTEGER DEFAULT 0,
        annotation_data TEXT,
        annotated_image_uri TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_item_id) REFERENCES CollectionItem(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_location_parent ON Location(parent_id);
      CREATE INDEX IF NOT EXISTS idx_location_warehouse ON Location(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_location_code ON Location(location_code);
      CREATE INDEX IF NOT EXISTS idx_location_is_active ON Location(is_active);
      CREATE INDEX IF NOT EXISTS idx_item_inventory_number ON Item(inventory_number);
      CREATE INDEX IF NOT EXISTS idx_item_collection ON Item(collection_id);
      CREATE INDEX IF NOT EXISTS idx_item_customer ON Item(customer_id);
      CREATE INDEX IF NOT EXISTS idx_item_location ON Item(current_location_id);
      CREATE INDEX IF NOT EXISTS idx_item_status ON Item(status);
      CREATE INDEX IF NOT EXISTS idx_item_archived ON Item(is_archived);
      CREATE INDEX IF NOT EXISTS idx_history_item ON ItemHistory(item_id);
      CREATE INDEX IF NOT EXISTS idx_history_timestamp ON ItemHistory(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_history_user ON ItemHistory(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_username ON User(username);
      CREATE INDEX IF NOT EXISTS idx_customer_name ON Customer(name);
      CREATE INDEX IF NOT EXISTS idx_customer_location_customer ON CustomerLocation(customer_id);
      CREATE INDEX IF NOT EXISTS idx_collection_customer ON Collection(customer_id);
      CREATE INDEX IF NOT EXISTS idx_collection_status ON Collection(status);
      CREATE INDEX IF NOT EXISTS idx_collection_display_id ON Collection(display_id);
      CREATE INDEX IF NOT EXISTS idx_collection_item_collection ON CollectionItem(collection_id);
      CREATE INDEX IF NOT EXISTS idx_collection_item_display_id ON CollectionItem(display_id);
      CREATE INDEX IF NOT EXISTS idx_collection_item_photo_item ON CollectionItemPhoto(collection_item_id);
      CREATE INDEX IF NOT EXISTS idx_photo_item ON ItemPhoto(item_id);
    `,
  },
  {
    version: 2,
    name: "seed_initial_data",
    up: `
      -- Insert default password policy
      INSERT OR IGNORE INTO PasswordPolicy (id, min_length, require_uppercase, require_number, require_special_char, force_change_on_first_login)
      VALUES (1, 8, 1, 1, 0, 1);

      -- Insert default warehouse
      INSERT OR IGNORE INTO Warehouse (id, name, code, is_active)
      VALUES (1, 'Warehouse 1', 'WH1', 1);

      -- Insert default admin user (password: admin - will be hashed properly)
      -- This is temporary and will be replaced with proper hashing
      INSERT OR IGNORE INTO User (id, username, password_hash, password_salt, role, must_change_password)
      VALUES (1, 'admin', 'temp_hash', 'temp_salt', 'admin', 0);

      -- Insert Warehouse 1
      INSERT OR IGNORE INTO Location (id, name, parent_id, full_path, code_part, location_code, level, warehouse_id, is_transit, is_active)
      VALUES (1, 'Warehouse 1', NULL, 'Warehouse 1', 'WH1', 'WH1', 0, 1, 0, 1);

      -- Insert Transit Room in Warehouse 1
      INSERT OR IGNORE INTO Location (id, name, parent_id, full_path, code_part, location_code, level, warehouse_id, is_transit, is_active)
      VALUES (2, 'Transit Room', 1, 'Warehouse 1 / Transit Room', 'T', 'WH1-T', 1, 1, 1, 1);
    `,
  },
  {
    version: 3,
    name: "fix_table_order_warehouse_location",
    up: `
      -- Drop tables in reverse dependency order
      DROP TABLE IF EXISTS CollectionItemPhoto;
      DROP TABLE IF EXISTS CollectionItem;
      DROP TABLE IF EXISTS CustomerLocation;
      DROP TABLE IF EXISTS LoginAttempt;
      DROP TABLE IF EXISTS AuditLog;
      DROP TABLE IF EXISTS Session;
      DROP TABLE IF EXISTS ItemHistory;
      DROP TABLE IF EXISTS ItemPhoto;
      DROP TABLE IF EXISTS Item;
      DROP TABLE IF EXISTS Collection;
      DROP TABLE IF EXISTS Customer;
      DROP TABLE IF EXISTS User;
      DROP TABLE IF EXISTS Location;
      DROP TABLE IF EXISTS Warehouse;
      DROP TABLE IF EXISTS PasswordPolicy;

      -- Recreate Warehouse BEFORE Location (fixed order)
      CREATE TABLE IF NOT EXISTS Warehouse (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      -- Now create Location with warehouse_id reference working
      CREATE TABLE IF NOT EXISTS Location (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        full_path TEXT NOT NULL,
        code_part TEXT,
        location_code TEXT UNIQUE,
        level INTEGER DEFAULT 0,
        warehouse_id INTEGER,
        is_transit INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (parent_id) REFERENCES Location(id),
        FOREIGN KEY (warehouse_id) REFERENCES Warehouse(id)
      );

      -- User table
      CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        must_change_password INTEGER DEFAULT 0,
        password_changed_at TEXT,
        last_login_at TEXT,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      -- Customer table (before Collection)
      CREATE TABLE IF NOT EXISTS Customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      -- Collection table (before Item)
      CREATE TABLE IF NOT EXISTS Collection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        display_id TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        collection_date INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'signed')),
        pickup_address TEXT NOT NULL,
        delivery_address TEXT,
        employee_name TEXT NOT NULL,
        notes TEXT,
        signature_uri TEXT,
        signer_name TEXT,
        signer_role TEXT,
        signature_timestamp INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES Customer(id)
      );

      -- Item table (after Location, Customer, Collection, User)
      CREATE TABLE IF NOT EXISTS Item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        inventory_number TEXT UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        artist_name TEXT,
        customer_id INTEGER,
        customer_name TEXT,
        collection_id INTEGER,
        status TEXT NOT NULL CHECK(status IN ('Collected', 'In transit', 'In storage', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
        current_location_id INTEGER,
        current_location_path TEXT,
        dimensions_length REAL,
        dimensions_width REAL,
        dimensions_height REAL,
        dimensions_unit TEXT,
        estimated_value REAL,
        currency TEXT,
        overall_condition TEXT,
        condition_notes TEXT,
        notes TEXT,
        is_archived INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (current_location_id) REFERENCES Location(id),
        FOREIGN KEY (collection_id) REFERENCES Collection(id),
        FOREIGN KEY (customer_id) REFERENCES Customer(id),
        FOREIGN KEY (created_by) REFERENCES User(id)
      );

      -- ItemPhoto table
      CREATE TABLE IF NOT EXISTS ItemPhoto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        item_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        condition_notes TEXT,
        ai_detected_damage TEXT,
        ai_analyzed INTEGER DEFAULT 0,
        annotation_data TEXT,
        annotated_uri TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES Item(id) ON DELETE CASCADE
      );

      -- ItemHistory table
      CREATE TABLE IF NOT EXISTS ItemHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        user_name TEXT,
        action_type TEXT NOT NULL CHECK(action_type IN ('COLLECTED', 'MOVED', 'STATUS_CHANGE', 'PACKED', 'SHIPPED', 'DELIVERED', 'NOTE', 'PHOTO_ADDED', 'UPDATED')),
        from_location_path TEXT,
        to_location_path TEXT,
        from_status TEXT,
        to_status TEXT,
        notes TEXT,
        device_id TEXT,
        ip_address TEXT,
        app_version TEXT,
        session_id TEXT,
        FOREIGN KEY (item_id) REFERENCES Item(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES User(id)
      );

      -- PasswordPolicy table
      CREATE TABLE IF NOT EXISTS PasswordPolicy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        min_length INTEGER DEFAULT 8,
        require_uppercase INTEGER DEFAULT 1,
        require_lowercase INTEGER DEFAULT 1,
        require_number INTEGER DEFAULT 1,
        require_special_char INTEGER DEFAULT 0,
        password_expiry_days INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        FOREIGN KEY (updated_by) REFERENCES User(id)
      );

      -- Session table
      CREATE TABLE IF NOT EXISTS Session (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        device_id TEXT,
        app_version TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        FOREIGN KEY (user_id) REFERENCES User(id)
      );

      -- AuditLog table
      CREATE TABLE IF NOT EXISTS AuditLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        user_id INTEGER,
        user_name TEXT,
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        app_version TEXT,
        session_id TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES User(id)
      );

      -- LoginAttempt table
      CREATE TABLE IF NOT EXISTS LoginAttempt (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        success INTEGER NOT NULL,
        ip_address TEXT,
        device_id TEXT,
        app_version TEXT,
        error_message TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- CustomerLocation table
      CREATE TABLE IF NOT EXISTS CustomerLocation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('pickup', 'delivery', 'both')),
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE
      );

      -- CollectionItem table
      CREATE TABLE IF NOT EXISTS CollectionItem (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        display_id TEXT UNIQUE NOT NULL,
        collection_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        artist_name TEXT,
        dimensions_length REAL NOT NULL,
        dimensions_width REAL NOT NULL,
        dimensions_height REAL NOT NULL,
        dimensions_unit TEXT NOT NULL CHECK(dimensions_unit IN ('cm', 'in')),
        weight REAL,
        weight_unit TEXT CHECK(weight_unit IN ('kg', 'lb')),
        estimated_value REAL NOT NULL,
        currency TEXT NOT NULL CHECK(currency IN ('USD', 'EUR', 'GBP')),
        overall_condition TEXT NOT NULL CHECK(overall_condition IN ('Excellent', 'Good', 'Fair', 'Poor', 'Damaged')),
        condition_notes TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (collection_id) REFERENCES Collection(id) ON DELETE CASCADE
      );

      -- CollectionItemPhoto table
      CREATE TABLE IF NOT EXISTS CollectionItemPhoto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        collection_item_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        condition_notes TEXT,
        ai_detected_damage TEXT,
        ai_analyzed INTEGER DEFAULT 0,
        annotation_data TEXT,
        annotated_image_uri TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_item_id) REFERENCES CollectionItem(id) ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_location_parent ON Location(parent_id);
      CREATE INDEX IF NOT EXISTS idx_location_warehouse ON Location(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_location_code ON Location(location_code);
      CREATE INDEX IF NOT EXISTS idx_location_is_active ON Location(is_active);
      CREATE INDEX IF NOT EXISTS idx_item_inventory_number ON Item(inventory_number);
      CREATE INDEX IF NOT EXISTS idx_item_collection ON Item(collection_id);
      CREATE INDEX IF NOT EXISTS idx_item_customer ON Item(customer_id);
      CREATE INDEX IF NOT EXISTS idx_item_location ON Item(current_location_id);
      CREATE INDEX IF NOT EXISTS idx_item_status ON Item(status);
      CREATE INDEX IF NOT EXISTS idx_item_is_archived ON Item(is_archived);
      CREATE INDEX IF NOT EXISTS idx_item_deleted ON Item(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_item_history_item ON ItemHistory(item_id);
      CREATE INDEX IF NOT EXISTS idx_item_history_timestamp ON ItemHistory(timestamp);
      CREATE INDEX IF NOT EXISTS idx_item_history_user ON ItemHistory(user_id);
      CREATE INDEX IF NOT EXISTS idx_item_history_session ON ItemHistory(session_id);
      CREATE INDEX IF NOT EXISTS idx_item_photo_item ON ItemPhoto(item_id);
      CREATE INDEX IF NOT EXISTS idx_user_username ON User(username);
      CREATE INDEX IF NOT EXISTS idx_user_is_active ON User(is_active);
      CREATE INDEX IF NOT EXISTS idx_session_uuid ON Session(uuid);
      CREATE INDEX IF NOT EXISTS idx_session_user ON Session(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON AuditLog(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON AuditLog(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON AuditLog(timestamp);
      CREATE INDEX IF NOT EXISTS idx_customer_uuid ON Customer(uuid);
      CREATE INDEX IF NOT EXISTS idx_customer_deleted ON Customer(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_collection_uuid ON Collection(uuid);
      CREATE INDEX IF NOT EXISTS idx_collection_display_id ON Collection(display_id);
      CREATE INDEX IF NOT EXISTS idx_collection_customer ON Collection(customer_id);
      CREATE INDEX IF NOT EXISTS idx_collection_status ON Collection(status);
      CREATE INDEX IF NOT EXISTS idx_collection_deleted ON Collection(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_collection_item_uuid ON CollectionItem(uuid);
      CREATE INDEX IF NOT EXISTS idx_collection_item_display_id ON CollectionItem(display_id);
      CREATE INDEX IF NOT EXISTS idx_collection_item_collection ON CollectionItem(collection_id);
      CREATE INDEX IF NOT EXISTS idx_collection_item_deleted ON CollectionItem(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_collection_item_photo_item ON CollectionItemPhoto(collection_item_id);

      -- Recreate default warehouse and locations
      INSERT OR IGNORE INTO Warehouse (id, name, code, is_active) VALUES (1, 'Warehouse 1', 'WH1', 1);
      INSERT OR IGNORE INTO Location (id, name, parent_id, full_path, code_part, location_code, level, warehouse_id, is_transit, is_active)
      VALUES (1, 'Warehouse 1', NULL, 'Warehouse 1', 'WH1', 'WH1', 0, 1, 0, 1);
      INSERT OR IGNORE INTO Location (id, name, parent_id, full_path, code_part, location_code, level, warehouse_id, is_transit, is_active)
      VALUES (2, 'Transit Room', 1, 'Warehouse 1 / Transit Room', 'T', 'WH1-T', 1, 1, 1, 1);

      -- Recreate default password policy
      INSERT OR IGNORE INTO PasswordPolicy (id, min_length, require_uppercase, require_lowercase, require_number, require_special_char, password_expiry_days)
      VALUES (1, 8, 1, 1, 1, 0, 0);

      -- Recreate default admin user (password: admin - will be hashed properly by initializeAdminUser)
      INSERT OR IGNORE INTO User (id, username, password_hash, password_salt, role, must_change_password)
      VALUES (1, 'admin', 'temp_hash', 'temp_salt', 'admin', 0);
    `,
  },
  {
    version: 4,
    name: "add_missing_admin_user",
    up: `
      -- Add admin user if missing (fixes issue where migration 3 dropped tables but didn't recreate admin)
      INSERT OR IGNORE INTO User (id, username, password_hash, password_salt, role, must_change_password, is_active)
      VALUES (1, 'admin', 'temp_hash', 'temp_salt', 'admin', 0, 1);
    `,
  },
  {
    version: 5,
    name: "seed_sample_customers",
    up: `
      -- Add sample customers so the app has data to work with
      INSERT OR IGNORE INTO Customer (id, uuid, name, phone, email, address)
      VALUES
        (1, 'CUST-001', 'John Smith', '+1-555-0101', 'john.smith@example.com', '123 Main Street, New York, NY 10001'),
        (2, 'CUST-002', 'Sarah Johnson', '+1-555-0102', 'sarah.j@example.com', '456 Oak Avenue, Los Angeles, CA 90001'),
        (3, 'CUST-003', 'Michael Brown', '+1-555-0103', 'mbrown@example.com', '789 Pine Road, Chicago, IL 60601'),
        (4, 'CUST-004', 'Emily Davis', '+1-555-0104', 'emily.davis@example.com', '321 Elm Street, Houston, TX 77001'),
        (5, 'CUST-005', 'David Wilson', '+1-555-0105', 'dwilson@example.com', '654 Maple Drive, Phoenix, AZ 85001');
    `,
  },
  {
    version: 6,
    name: "seed_sample_inventory_items",
    up: `
      -- Add sample inventory items so users can search and test inventory management
      INSERT OR IGNORE INTO Item (id, uuid, inventory_number, title, description, artist_name, customer_id, customer_name, status, current_location_id, current_location_path, dimensions_length, dimensions_width, dimensions_height, dimensions_unit, estimated_value, currency, overall_condition, created_by)
      VALUES
        (1, 'ITEM-001', 'INV-2025-001', 'Abstract Composition', 'Large canvas painting with vibrant colors', 'Pablo Martinez', 1, 'John Smith', 'In storage', 2, 'Warehouse 1 / Transit Room', 120, 90, 5, 'cm', 5000, 'USD', 'Excellent', 1),
        (2, 'ITEM-002', 'INV-2025-002', 'Bronze Sculpture', 'Contemporary bronze figure sculpture', 'Lisa Chen', 1, 'John Smith', 'In storage', 2, 'Warehouse 1 / Transit Room', 40, 30, 60, 'cm', 8500, 'USD', 'Good', 1),
        (3, 'ITEM-003', 'INV-2025-003', 'Vintage Vase', 'Ming Dynasty ceramic vase', 'Unknown', 2, 'Sarah Johnson', 'In storage', 2, 'Warehouse 1 / Transit Room', 25, 25, 40, 'cm', 15000, 'USD', 'Fair', 1),
        (4, 'ITEM-004', 'INV-2025-004', 'Modern Chair', 'Mid-century modern lounge chair', 'Charles Eames', 3, 'Michael Brown', 'In storage', 2, 'Warehouse 1 / Transit Room', 80, 80, 90, 'cm', 3500, 'USD', 'Excellent', 1),
        (5, 'ITEM-005', 'INV-2025-005', 'Oil Portrait', 'Classical oil portrait painting', 'Jane Anderson', 2, 'Sarah Johnson', 'In storage', 2, 'Warehouse 1 / Transit Room', 60, 80, 4, 'cm', 6000, 'USD', 'Good', 1),
        (6, 'ITEM-006', 'INV-2025-006', 'Marble Bust', 'Roman style marble bust sculpture', 'Unknown', 4, 'Emily Davis', 'In storage', 2, 'Warehouse 1 / Transit Room', 30, 30, 50, 'cm', 4500, 'USD', 'Excellent', 1),
        (7, 'ITEM-007', 'INV-2025-007', 'Decorative Mirror', 'Antique gilded frame mirror', 'Unknown', 3, 'Michael Brown', 'In storage', 2, 'Warehouse 1 / Transit Room', 100, 150, 10, 'cm', 2500, 'USD', 'Good', 1),
        (8, 'ITEM-008', 'INV-2025-008', 'Silk Rug', 'Persian silk rug with intricate patterns', 'Unknown', 5, 'David Wilson', 'In storage', 2, 'Warehouse 1 / Transit Room', 200, 150, 1, 'cm', 12000, 'USD', 'Excellent', 1),
        (9, 'ITEM-009', 'INV-2025-009', 'Crystal Chandelier', 'Vintage Bohemian crystal chandelier', 'Unknown', 4, 'Emily Davis', 'In storage', 2, 'Warehouse 1 / Transit Room', 80, 80, 120, 'cm', 7500, 'USD', 'Good', 1),
        (10, 'ITEM-010', 'INV-2025-010', 'Wooden Cabinet', 'Antique mahogany display cabinet', 'Unknown', 5, 'David Wilson', 'In storage', 2, 'Warehouse 1 / Transit Room', 120, 50, 180, 'cm', 3000, 'USD', 'Fair', 1);
    `,
  },
  {
    version: 7,
    name: "fix_itemhistory_schema",
    up: `
      -- Migration 7: Fix ItemHistory table schema
      -- Previous migration had wrong column name (action instead of action_type)

      -- Drop and recreate ItemHistory table with correct schema
      DROP TABLE IF EXISTS ItemHistory;

      CREATE TABLE ItemHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        user_name TEXT,
        action_type TEXT NOT NULL CHECK(action_type IN ('COLLECTED', 'MOVED', 'STATUS_CHANGE', 'PACKED', 'SHIPPED', 'DELIVERED', 'NOTE', 'PHOTO_ADDED', 'UPDATED')),
        from_location_path TEXT,
        to_location_path TEXT,
        from_status TEXT,
        to_status TEXT,
        notes TEXT,
        device_id TEXT,
        ip_address TEXT,
        app_version TEXT,
        session_id TEXT,
        FOREIGN KEY (item_id) REFERENCES Item(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES User(id)
      );

      -- Recreate index
      CREATE INDEX IF NOT EXISTS idx_history_item ON ItemHistory(item_id);
      CREATE INDEX IF NOT EXISTS idx_history_timestamp ON ItemHistory(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_history_user ON ItemHistory(user_id);
    `,
  },
  {
    version: 8,
    name: "add_photo_gps_and_source_tracking",
    up: `
      -- Migration 8: Add GPS coordinates and source tracking to photos
      -- Also add action types for note and photo operations in ItemHistory

      -- Add GPS and source fields to CollectionItemPhoto
      ALTER TABLE CollectionItemPhoto ADD COLUMN latitude REAL;
      ALTER TABLE CollectionItemPhoto ADD COLUMN longitude REAL;
      ALTER TABLE CollectionItemPhoto ADD COLUMN source TEXT DEFAULT 'collection_flow' CHECK(source IN ('collection_flow', 'added_later'));
      ALTER TABLE CollectionItemPhoto ADD COLUMN is_locked INTEGER DEFAULT 1;
      ALTER TABLE CollectionItemPhoto ADD COLUMN deleted_at TEXT;

      -- Update ItemHistory action_type to include more granular actions
      -- Note: SQLite doesn't support modifying CHECK constraints, so we'll rely on application logic
      -- The existing CHECK constraint already allows these action types we'll use:
      -- For notes: 'NOTE' (already exists)
      -- For photos: 'PHOTO_ADDED', 'UPDATED' (already exist)
      -- We'll add: NOTE_ADDED, NOTE_EDITED, NOTE_DELETED, PHOTO_DELETED

      -- Create index for photo source queries
      CREATE INDEX IF NOT EXISTS idx_photo_source ON CollectionItemPhoto(source);
      CREATE INDEX IF NOT EXISTS idx_photo_deleted ON CollectionItemPhoto(deleted_at);
    `,
  },
  {
    version: 9,
    name: "add_note_edit_tracking",
    up: `
      -- Migration 9: Add note edit tracking to preserve original notes
      -- When notes are edited after signature, we preserve the original

      -- Add fields to track note edits
      ALTER TABLE CollectionItemPhoto ADD COLUMN original_note TEXT;
      ALTER TABLE CollectionItemPhoto ADD COLUMN note_edited_at TEXT;
      ALTER TABLE CollectionItemPhoto ADD COLUMN note_edited_by INTEGER REFERENCES User(id);

      -- Create index for note edit queries
      CREATE INDEX IF NOT EXISTS idx_photo_note_edited ON CollectionItemPhoto(note_edited_at);
    `,
  },
  {
    version: 10,
    name: "add_gps_to_item_photo",
    up: `
      -- Migration 10: Add GPS coordinates to ItemPhoto table
      -- This allows inventory photos to have location tracking

      -- Add GPS fields to ItemPhoto
      ALTER TABLE ItemPhoto ADD COLUMN latitude REAL;
      ALTER TABLE ItemPhoto ADD COLUMN longitude REAL;

      -- Create index for GPS queries
      CREATE INDEX IF NOT EXISTS idx_item_photo_gps ON ItemPhoto(latitude, longitude);
    `,
  },
];

// Get current schema version
export async function getCurrentVersion(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ version: number }>(
      "SELECT MAX(version) as version FROM schema_version"
    );
    return result?.version || 0;
  } catch (error) {
    // Table doesn't exist yet
    return 0;
  }
}

// Run migrations
export async function runMigrations(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  console.log(`📦 Current schema version: ${currentVersion}`);

  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log("✅ Database is up to date");
    return;
  }

  console.log(`🔄 Running ${pendingMigrations.length} migrations...`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`  → Applying migration ${migration.version}: ${migration.name}`);
      await db.execAsync(migration.up);
      await db.runAsync(
        "INSERT INTO schema_version (version) VALUES (?)",
        [migration.version]
      );
      console.log(`  ✅ Migration ${migration.version} applied`);
    } catch (error) {
      console.error(`  ❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  console.log("✅ All migrations completed successfully");
}

// Rollback to specific version (for development)
export async function rollbackToVersion(
  db: SQLite.SQLiteDatabase,
  targetVersion: number
): Promise<void> {
  const currentVersion = await getCurrentVersion(db);

  if (targetVersion >= currentVersion) {
    console.log("Nothing to rollback");
    return;
  }

  const migrationsToRollback = MIGRATIONS.filter(
    (m) => m.version > targetVersion && m.version <= currentVersion
  ).reverse();

  for (const migration of migrationsToRollback) {
    if (migration.down) {
      console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
      await db.execAsync(migration.down);
      await db.runAsync("DELETE FROM schema_version WHERE version = ?", [
        migration.version,
      ]);
    } else {
      throw new Error(
        `Cannot rollback migration ${migration.version}: no down script`
      );
    }
  }

  console.log(`✅ Rolled back to version ${targetVersion}`);
}
