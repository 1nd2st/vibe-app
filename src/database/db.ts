// Database service for Inventory Management
import * as SQLite from "expo-sqlite";
import { CREATE_TABLES, SEED_INITIAL_DATA } from "./schema";

// Types
export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  full_path: string;
  level: number;
  is_transit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  inventory_number: string;
  description: string | null;
  customer_name: string | null;
  status: ItemStatus;
  current_location_id: number;
  current_location_path: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemHistory {
  id: number;
  item_id: number;
  timestamp: string;
  user_id: number | null;
  user_name: string | null;
  action_type: ActionType;
  from_location_path: string | null;
  to_location_path: string | null;
  from_status: ItemStatus | null;
  to_status: ItemStatus | null;
  notes: string | null;
  device_id: string | null;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ItemStatus =
  | "Collected"
  | "In transit"
  | "In storage"
  | "Packed"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type ActionType =
  | "COLLECTED"
  | "MOVED"
  | "STATUS_CHANGE"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "NOTE";

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync("inventory.db");

    // Create tables
    await db.execAsync(CREATE_TABLES);

    // Seed initial data
    await db.execAsync(SEED_INITIAL_DATA);

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Get database instance
function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// ============= USER OPERATIONS =============

export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const database = getDB();
  const result = await database.getFirstAsync<User>(
    "SELECT * FROM User WHERE username = ? AND password_hash = ? AND is_active = 1",
    [username, password]
  );
  return result || null;
}

export async function getUserById(userId: number): Promise<User | null> {
  const database = getDB();
  const result = await database.getFirstAsync<User>(
    "SELECT * FROM User WHERE id = ?",
    [userId]
  );
  return result || null;
}

// ============= LOCATION OPERATIONS =============

export async function getLocations(
  parentId: number | null = null,
  activeOnly: boolean = true
): Promise<Location[]> {
  const database = getDB();
  let query = "SELECT * FROM Location WHERE parent_id ";

  if (parentId === null) {
    query += "IS NULL";
  } else {
    query += `= ${parentId}`;
  }

  if (activeOnly) {
    query += " AND is_active = 1";
  }

  query += " ORDER BY name ASC";

  const result = await database.getAllAsync<Location>(query);
  return result.map((loc) => ({
    ...loc,
    is_transit: Boolean(loc.is_transit),
    is_active: Boolean(loc.is_active),
  }));
}

export async function getLocationById(
  locationId: number
): Promise<Location | null> {
  const database = getDB();
  const result = await database.getFirstAsync<Location>(
    "SELECT * FROM Location WHERE id = ?",
    [locationId]
  );
  if (!result) return null;
  return {
    ...result,
    is_transit: Boolean(result.is_transit),
    is_active: Boolean(result.is_active),
  };
}

export async function getTransitLocation(): Promise<Location | null> {
  const database = getDB();
  const result = await database.getFirstAsync<Location>(
    "SELECT * FROM Location WHERE is_transit = 1 AND is_active = 1 LIMIT 1"
  );
  if (!result) return null;
  return {
    ...result,
    is_transit: Boolean(result.is_transit),
    is_active: Boolean(result.is_active),
  };
}

export async function createLocation(
  name: string,
  parentId: number | null
): Promise<number> {
  const database = getDB();

  // Build full_path and level
  let fullPath = name;
  let level = 0;

  if (parentId !== null) {
    const parent = await getLocationById(parentId);
    if (parent) {
      fullPath = `${parent.full_path} / ${name}`;
      level = parent.level + 1;
    }
  }

  const result = await database.runAsync(
    "INSERT INTO Location (name, parent_id, full_path, level) VALUES (?, ?, ?, ?)",
    [name, parentId, fullPath, level]
  );

  return result.lastInsertRowId;
}

export async function updateLocation(
  locationId: number,
  name: string
): Promise<void> {
  const database = getDB();

  // Get current location
  const location = await getLocationById(locationId);
  if (!location) throw new Error("Location not found");

  // Build new full_path
  let newFullPath = name;
  if (location.parent_id !== null) {
    const parent = await getLocationById(location.parent_id);
    if (parent) {
      newFullPath = `${parent.full_path} / ${name}`;
    }
  }

  // Update location
  await database.runAsync(
    "UPDATE Location SET name = ?, full_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [name, newFullPath, locationId]
  );

  // Update all child locations recursively
  await updateChildLocationPaths(locationId, newFullPath);
}

async function updateChildLocationPaths(
  parentId: number,
  parentPath: string
): Promise<void> {
  const database = getDB();
  const children = await database.getAllAsync<Location>(
    "SELECT * FROM Location WHERE parent_id = ?",
    [parentId]
  );

  for (const child of children) {
    const newPath = `${parentPath} / ${child.name}`;
    await database.runAsync(
      "UPDATE Location SET full_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newPath, child.id]
    );
    await updateChildLocationPaths(child.id, newPath);
  }
}

export async function disableLocation(locationId: number): Promise<void> {
  const database = getDB();

  // Check if location has items
  const items = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM Item WHERE current_location_id = ?",
    [locationId]
  );

  if (items && items.count > 0) {
    throw new Error(
      "Cannot disable location with items. Move items first."
    );
  }

  await database.runAsync(
    "UPDATE Location SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [locationId]
  );
}

export async function getItemCountForLocation(
  locationId: number
): Promise<number> {
  const database = getDB();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM Item WHERE current_location_id = ? AND is_archived = 0",
    [locationId]
  );
  return result?.count || 0;
}

// ============= ITEM OPERATIONS =============

export async function getItemByInventoryNumber(
  inventoryNumber: string
): Promise<InventoryItem | null> {
  const database = getDB();
  const result = await database.getFirstAsync<InventoryItem>(
    "SELECT * FROM Item WHERE inventory_number = ? AND is_archived = 0",
    [inventoryNumber]
  );
  if (!result) return null;
  return {
    ...result,
    is_archived: Boolean(result.is_archived),
  };
}

export async function searchItems(
  searchTerm: string,
  statusFilter?: ItemStatus
): Promise<InventoryItem[]> {
  const database = getDB();
  let query =
    "SELECT * FROM Item WHERE is_archived = 0 AND (inventory_number LIKE ? OR description LIKE ? OR customer_name LIKE ?)";
  const params: any[] = [
    `%${searchTerm}%`,
    `%${searchTerm}%`,
    `%${searchTerm}%`,
  ];

  if (statusFilter) {
    query += " AND status = ?";
    params.push(statusFilter);
  }

  query += " ORDER BY created_at DESC";

  const result = await database.getAllAsync<InventoryItem>(query, params);
  return result.map((item) => ({
    ...item,
    is_archived: Boolean(item.is_archived),
  }));
}

export async function getItemsByLocation(
  locationId: number
): Promise<InventoryItem[]> {
  const database = getDB();
  const result = await database.getAllAsync<InventoryItem>(
    "SELECT * FROM Item WHERE current_location_id = ? AND is_archived = 0 ORDER BY created_at DESC",
    [locationId]
  );
  return result.map((item) => ({
    ...item,
    is_archived: Boolean(item.is_archived),
  }));
}

export async function createItem(
  inventoryNumber: string,
  description: string | null,
  customerName: string | null,
  status: ItemStatus,
  locationId: number,
  userId: number | null,
  userName: string | null
): Promise<number> {
  const database = getDB();

  // Get location path
  const location = await getLocationById(locationId);
  if (!location) throw new Error("Location not found");

  // Create item
  const result = await database.runAsync(
    "INSERT INTO Item (inventory_number, description, customer_name, status, current_location_id, current_location_path) VALUES (?, ?, ?, ?, ?, ?)",
    [
      inventoryNumber,
      description,
      customerName,
      status,
      locationId,
      location.full_path,
    ]
  );

  const itemId = result.lastInsertRowId;

  // Create history entry
  await addItemHistory(
    itemId,
    userId,
    userName,
    "COLLECTED",
    null,
    location.full_path,
    null,
    status,
    null
  );

  return itemId;
}

export async function updateItemLocation(
  itemId: number,
  newLocationId: number,
  newStatus: ItemStatus,
  userId: number | null,
  userName: string | null
): Promise<void> {
  const database = getDB();

  // Get current item
  const item = await database.getFirstAsync<InventoryItem>(
    "SELECT * FROM Item WHERE id = ?",
    [itemId]
  );
  if (!item) throw new Error("Item not found");

  // Get new location
  const newLocation = await getLocationById(newLocationId);
  if (!newLocation) throw new Error("Location not found");

  // Update item
  await database.runAsync(
    "UPDATE Item SET current_location_id = ?, current_location_path = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newLocationId, newLocation.full_path, newStatus, itemId]
  );

  // Create history entry
  await addItemHistory(
    itemId,
    userId,
    userName,
    "MOVED",
    item.current_location_path,
    newLocation.full_path,
    item.status,
    newStatus,
    null
  );
}

export async function updateItemStatus(
  itemId: number,
  newStatus: ItemStatus,
  userId: number | null,
  userName: string | null
): Promise<void> {
  const database = getDB();

  // Get current item
  const item = await database.getFirstAsync<InventoryItem>(
    "SELECT * FROM Item WHERE id = ?",
    [itemId]
  );
  if (!item) throw new Error("Item not found");

  // Update item
  await database.runAsync(
    "UPDATE Item SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newStatus, itemId]
  );

  // Create history entry
  await addItemHistory(
    itemId,
    userId,
    userName,
    "STATUS_CHANGE",
    null,
    null,
    item.status,
    newStatus,
    null
  );
}

export async function addItemNote(
  itemId: number,
  notes: string,
  userId: number | null,
  userName: string | null
): Promise<void> {
  const database = getDB();

  // Update item notes
  await database.runAsync(
    "UPDATE Item SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [notes, itemId]
  );

  // Create history entry
  await addItemHistory(
    itemId,
    userId,
    userName,
    "NOTE",
    null,
    null,
    null,
    null,
    notes
  );
}

// ============= ITEM HISTORY OPERATIONS =============

export async function addItemHistory(
  itemId: number,
  userId: number | null,
  userName: string | null,
  actionType: ActionType,
  fromLocationPath: string | null,
  toLocationPath: string | null,
  fromStatus: ItemStatus | null,
  toStatus: ItemStatus | null,
  notes: string | null
): Promise<number> {
  const database = getDB();

  const result = await database.runAsync(
    "INSERT INTO ItemHistory (item_id, user_id, user_name, action_type, from_location_path, to_location_path, from_status, to_status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      itemId,
      userId,
      userName,
      actionType,
      fromLocationPath,
      toLocationPath,
      fromStatus,
      toStatus,
      notes,
    ]
  );

  return result.lastInsertRowId;
}

export async function getItemHistory(itemId: number): Promise<ItemHistory[]> {
  const database = getDB();
  const result = await database.getAllAsync<ItemHistory>(
    "SELECT * FROM ItemHistory WHERE item_id = ? ORDER BY timestamp DESC",
    [itemId]
  );
  return result;
}

export async function getItemById(itemId: number): Promise<InventoryItem | null> {
  const database = getDB();
  const result = await database.getFirstAsync<InventoryItem>(
    "SELECT * FROM Item WHERE id = ?",
    [itemId]
  );
  if (!result) return null;
  return {
    ...result,
    is_archived: Boolean(result.is_archived),
  };
}
