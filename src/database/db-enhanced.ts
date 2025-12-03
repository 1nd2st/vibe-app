// Enhanced database service with migration system
import * as SQLite from "expo-sqlite";
import { runMigrations } from "./migrations";
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  generateTempPassword,
  validatePassword,
  generateUUID,
  getDeviceInfo,
  getCurrentSessionId,
  PasswordPolicy as SecurityPasswordPolicy,
} from "../utils/security";

// ============= TYPE DEFINITIONS =============

export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  full_path: string;
  code_part: string | null;
  location_code: string | null;
  level: number;
  warehouse_id: number | null;
  is_transit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InventoryItem {
  id: number;
  uuid: string;
  inventory_number: string;
  title: string | null;
  description: string | null;
  artist_name: string | null;
  customer_id: number | null;
  customer_name: string | null;
  collection_id: number | null;
  status: ItemStatus;
  current_location_id: number | null;
  current_location_path: string | null;
  dimensions_length: number | null;
  dimensions_width: number | null;
  dimensions_height: number | null;
  dimensions_unit: string | null;
  estimated_value: number | null;
  currency: string | null;
  overall_condition: string | null;
  condition_notes: string | null;
  notes: string | null;
  is_archived: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  ip_address: string | null;
  app_version: string | null;
  session_id: string | null;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  role: "user" | "admin";
  must_change_password: boolean;
  password_changed_at: string | null;
  last_login_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UserLocationUsage {
  id: number;
  user_id: number;
  location_id: number;
  usage_count: number;
  last_used_at: string;
  is_favorite: boolean;
}

export interface PasswordPolicy {
  id: number;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special_char: boolean;
  password_expiry_days: number;
  force_change_on_first_login: boolean;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  updated_at: string;
}

export interface ChangeLog {
  id: number;
  entity_type: string;
  entity_id: number | null;
  action: string;
  user_id: number | null;
  user_name: string | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  app_version: string | null;
  session_id: string | null;
  timestamp: string;
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
  | "NOTE"
  | "PHOTO_ADDED"
  | "UPDATED";

let db: SQLite.SQLiteDatabase | null = null;

// ============= DATABASE INITIALIZATION =============

export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync("inventory.db");

    // Run migrations
    await runMigrations(db);

    // Initialize admin user with proper hashing if not exists
    await initializeAdminUser();

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

async function initializeAdminUser(): Promise<void> {
  const database = getDB();

  // Check if admin exists
  const admin = await database.getFirstAsync<User>(
    "SELECT * FROM User WHERE username = ?",
    ["admin"]
  );

  if (admin && admin.password_hash === "temp_hash") {
    // Replace temp admin with properly hashed password
    const salt = await generateSalt();
    const hash = await hashPassword("admin", salt);

    await database.runAsync(
      "UPDATE User SET password_hash = ?, password_salt = ? WHERE id = ?",
      [hash, salt, admin.id]
    );
    console.log("✅ Admin user password hashed");
  }
}

function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

// ============= USER AUTHENTICATION =============

export async function authenticateUser(
  username: string,
  password: string,
  ipAddress?: string
): Promise<User | null> {
  const database = getDB();
  const deviceInfo = await getDeviceInfo();

  // Get user
  const user = await database.getFirstAsync<User>(
    "SELECT * FROM User WHERE username = ? AND is_active = 1 AND deleted_at IS NULL",
    [username]
  );

  // Log attempt
  const success = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;

  await database.runAsync(
    "INSERT INTO LoginAttempt (username, success, ip_address, device_id, app_version, error_message) VALUES (?, ?, ?, ?, ?, ?)",
    [
      username,
      success ? 1 : 0,
      ipAddress || null,
      deviceInfo.deviceId,
      deviceInfo.appVersion,
      success ? null : "Invalid credentials",
    ]
  );

  if (!user) {
    return null;
  }

  // Check if account is locked
  if (user.locked_until) {
    const lockUntil = new Date(user.locked_until);
    if (lockUntil > new Date()) {
      throw new Error(`Account locked until ${lockUntil.toLocaleString()}`);
    } else {
      // Unlock account
      await database.runAsync(
        "UPDATE User SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?",
        [user.id]
      );
    }
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash, user.password_salt);

  if (!isValid) {
    // Increment failed attempts
    const newAttempts = user.failed_login_attempts + 1;
    const policy = await getPasswordPolicy();

    let lockedUntil = null;
    if (newAttempts >= policy.max_failed_attempts) {
      const lockDate = new Date();
      lockDate.setMinutes(lockDate.getMinutes() + policy.lockout_duration_minutes);
      lockedUntil = lockDate.toISOString();
    }

    await database.runAsync(
      "UPDATE User SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
      [newAttempts, lockedUntil, user.id]
    );

    return null;
  }

  // Successful login - reset failed attempts, update last login
  await database.runAsync(
    "UPDATE User SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
    [user.id]
  );

  return {
    ...user,
    must_change_password: Boolean(user.must_change_password),
    is_active: Boolean(user.is_active),
  };
}

export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; errors: string[] }> {
  const database = getDB();

  // Get user
  const user = await database.getFirstAsync<User>(
    "SELECT * FROM User WHERE id = ?",
    [userId]
  );

  if (!user) {
    return { success: false, errors: ["User not found"] };
  }

  // Verify old password
  const isValid = await verifyPassword(oldPassword, user.password_hash, user.password_salt);
  if (!isValid) {
    return { success: false, errors: ["Current password is incorrect"] };
  }

  // Validate new password against policy
  const policy = await getPasswordPolicy();
  const validation = validatePassword(newPassword, {
    min_length: policy.min_length,
    require_uppercase: policy.require_uppercase,
    require_lowercase: policy.require_lowercase,
    require_number: policy.require_number,
    require_special_char: policy.require_special_char,
  });

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Hash new password
  const newSalt = await generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  // Update password
  await database.runAsync(
    "UPDATE User SET password_hash = ?, password_salt = ?, must_change_password = 0, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newHash, newSalt, userId]
  );

  return { success: true, errors: [] };
}

// ============= USER MANAGEMENT (ADMIN) =============

export async function getUsers(): Promise<User[]> {
  const database = getDB();
  const users = await database.getAllAsync<User>(
    "SELECT * FROM User WHERE deleted_at IS NULL ORDER BY username ASC"
  );
  return users.map((u) => ({
    ...u,
    must_change_password: Boolean(u.must_change_password),
    is_active: Boolean(u.is_active),
  }));
}

export async function createUser(
  username: string,
  role: "user" | "admin",
  createdBy: number
): Promise<{ tempPassword: string; userId: number }> {
  const database = getDB();

  // Generate temp password
  const tempPassword = generateTempPassword(12);
  const salt = await generateSalt();
  const hash = await hashPassword(tempPassword, salt);

  // Create user
  const result = await database.runAsync(
    "INSERT INTO User (username, password_hash, password_salt, role, must_change_password) VALUES (?, ?, ?, ?, 1)",
    [username, hash, salt, role]
  );

  // Log change
  await logChange("User", result.lastInsertRowId, "CREATED", createdBy, null, {
    username,
    role,
  });

  return {
    tempPassword,
    userId: result.lastInsertRowId,
  };
}

export async function updateUserRole(
  userId: number,
  newRole: "user" | "admin",
  updatedBy: number
): Promise<void> {
  const database = getDB();

  const oldUser = await database.getFirstAsync<User>("SELECT * FROM User WHERE id = ?", [userId]);

  await database.runAsync(
    "UPDATE User SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newRole, userId]
  );

  await logChange("User", userId, "ROLE_CHANGED", updatedBy, { role: oldUser?.role }, { role: newRole });
}

export async function toggleUserActive(
  userId: number,
  isActive: boolean,
  updatedBy: number
): Promise<void> {
  const database = getDB();

  await database.runAsync(
    "UPDATE User SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [isActive ? 1 : 0, userId]
  );

  await logChange("User", userId, isActive ? "ACTIVATED" : "DEACTIVATED", updatedBy, null, null);
}

export async function resetUserPassword(
  userId: number,
  resetBy: number
): Promise<string> {
  const database = getDB();

  const tempPassword = generateTempPassword(12);
  const salt = await generateSalt();
  const hash = await hashPassword(tempPassword, salt);

  await database.runAsync(
    "UPDATE User SET password_hash = ?, password_salt = ?, must_change_password = 1, password_changed_at = NULL WHERE id = ?",
    [hash, salt, userId]
  );

  await logChange("User", userId, "PASSWORD_RESET", resetBy, null, null);

  return tempPassword;
}

// ============= PASSWORD POLICY =============

export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  const database = getDB();
  const policy = await database.getFirstAsync<PasswordPolicy>(
    "SELECT * FROM PasswordPolicy WHERE id = 1"
  );

  if (!policy) {
    // Return default policy
    return {
      id: 1,
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_number: true,
      require_special_char: false,
      password_expiry_days: 90,
      force_change_on_first_login: true,
      max_failed_attempts: 5,
      lockout_duration_minutes: 30,
      updated_at: new Date().toISOString(),
    };
  }

  return {
    ...policy,
    require_uppercase: Boolean(policy.require_uppercase),
    require_lowercase: Boolean(policy.require_lowercase),
    require_number: Boolean(policy.require_number),
    require_special_char: Boolean(policy.require_special_char),
    force_change_on_first_login: Boolean(policy.force_change_on_first_login),
  };
}

export async function updatePasswordPolicy(
  policy: Partial<PasswordPolicy>,
  updatedBy: number
): Promise<void> {
  const database = getDB();

  const fields: string[] = [];
  const values: any[] = [];

  if (policy.min_length !== undefined) {
    fields.push("min_length = ?");
    values.push(policy.min_length);
  }
  if (policy.require_uppercase !== undefined) {
    fields.push("require_uppercase = ?");
    values.push(policy.require_uppercase ? 1 : 0);
  }
  if (policy.require_lowercase !== undefined) {
    fields.push("require_lowercase = ?");
    values.push(policy.require_lowercase ? 1 : 0);
  }
  if (policy.require_number !== undefined) {
    fields.push("require_number = ?");
    values.push(policy.require_number ? 1 : 0);
  }
  if (policy.require_special_char !== undefined) {
    fields.push("require_special_char = ?");
    values.push(policy.require_special_char ? 1 : 0);
  }
  if (policy.password_expiry_days !== undefined) {
    fields.push("password_expiry_days = ?");
    values.push(policy.password_expiry_days);
  }
  if (policy.force_change_on_first_login !== undefined) {
    fields.push("force_change_on_first_login = ?");
    values.push(policy.force_change_on_first_login ? 1 : 0);
  }
  if (policy.max_failed_attempts !== undefined) {
    fields.push("max_failed_attempts = ?");
    values.push(policy.max_failed_attempts);
  }
  if (policy.lockout_duration_minutes !== undefined) {
    fields.push("lockout_duration_minutes = ?");
    values.push(policy.lockout_duration_minutes);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  await database.runAsync(
    `UPDATE PasswordPolicy SET ${fields.join(", ")} WHERE id = 1`,
    values
  );

  await logChange("PasswordPolicy", 1, "UPDATED", updatedBy, null, policy);
}

// ============= WAREHOUSE MANAGEMENT =============

export async function getWarehouses(): Promise<Warehouse[]> {
  const database = getDB();
  const warehouses = await database.getAllAsync<Warehouse>(
    "SELECT * FROM Warehouse WHERE deleted_at IS NULL ORDER BY name ASC"
  );
  return warehouses.map((w) => ({ ...w, is_active: Boolean(w.is_active) }));
}

export async function getWarehouseById(id: number): Promise<Warehouse | null> {
  const database = getDB();
  const warehouse = await database.getFirstAsync<Warehouse>(
    "SELECT * FROM Warehouse WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  if (!warehouse) return null;
  return { ...warehouse, is_active: Boolean(warehouse.is_active) };
}

// ============= LOCATION OPERATIONS WITH CODE SUPPORT =============

export async function getLocations(
  parentId: number | null = null,
  activeOnly: boolean = true,
  warehouseId?: number
): Promise<Location[]> {
  const database = getDB();
  let query = "SELECT * FROM Location WHERE parent_id ";
  const params: any[] = [];

  if (parentId === null) {
    query += "IS NULL";
  } else {
    query += "= ?";
    params.push(parentId);
  }

  if (activeOnly) {
    query += " AND is_active = 1 AND deleted_at IS NULL";
  }

  if (warehouseId) {
    query += " AND warehouse_id = ?";
    params.push(warehouseId);
  }

  query += " ORDER BY name ASC";

  const result = await database.getAllAsync<Location>(query, params);
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

export async function getLocationByCode(code: string): Promise<Location | null> {
  const database = getDB();
  const result = await database.getFirstAsync<Location>(
    "SELECT * FROM Location WHERE location_code = ? AND deleted_at IS NULL",
    [code]
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
  codePart: string,
  parentId: number | null,
  warehouseId: number,
  createdBy: number
): Promise<number> {
  const database = getDB();

  // Validate code_part format
  if (!/^[A-Z0-9_-]+$/i.test(codePart)) {
    throw new Error("Location code must contain only letters, numbers, dash, or underscore");
  }

  // Convert to uppercase
  const normalizedCodePart = codePart.toUpperCase();

  // Build full_path and location_code
  let fullPath = name;
  let locationCode = normalizedCodePart;
  let level = 0;

  if (parentId !== null) {
    const parent = await getLocationById(parentId);
    if (parent) {
      fullPath = `${parent.full_path} / ${name}`;
      locationCode = parent.location_code
        ? `${parent.location_code}-${normalizedCodePart}`
        : normalizedCodePart;
      level = parent.level + 1;
    }
  }

  // Check if location_code already exists
  const existing = await getLocationByCode(locationCode);
  if (existing) {
    throw new Error(`Location code "${locationCode}" already exists`);
  }

  const result = await database.runAsync(
    "INSERT INTO Location (name, parent_id, full_path, code_part, location_code, level, warehouse_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name, parentId, fullPath, normalizedCodePart, locationCode, level, warehouseId]
  );

  await logChange("Location", result.lastInsertRowId, "CREATED", createdBy, null, {
    name,
    location_code: locationCode,
  });

  return result.lastInsertRowId;
}

export async function updateLocation(
  locationId: number,
  name: string,
  updatedBy: number
): Promise<void> {
  const database = getDB();

  // Get current location
  const location = await getLocationById(locationId);
  if (!location) throw new Error("Location not found");

  // Build new full_path (keep same code)
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

  await logChange("Location", locationId, "RENAMED", updatedBy, { name: location.name }, { name });
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

export async function disableLocation(
  locationId: number,
  disabledBy: number
): Promise<void> {
  const database = getDB();

  // Check if location has items
  const items = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM Item WHERE current_location_id = ? AND is_archived = 0",
    [locationId]
  );

  if (items && items.count > 0) {
    throw new Error("Cannot disable location with items. Move items first.");
  }

  await database.runAsync(
    "UPDATE Location SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [locationId]
  );

  await logChange("Location", locationId, "DISABLED", disabledBy, null, null);
}

export async function getItemCountForLocation(
  locationId: number
): Promise<number> {
  const database = getDB();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM Item WHERE current_location_id = ? AND is_archived = 0 AND deleted_at IS NULL",
    [locationId]
  );
  return result?.count || 0;
}

export async function getTransitLocation(
  warehouseId: number = 1
): Promise<Location | null> {
  const database = getDB();
  const result = await database.getFirstAsync<Location>(
    "SELECT * FROM Location WHERE warehouse_id = ? AND is_transit = 1 AND is_active = 1 AND deleted_at IS NULL LIMIT 1",
    [warehouseId]
  );
  if (!result) return null;
  return {
    ...result,
    is_transit: Boolean(result.is_transit),
    is_active: Boolean(result.is_active),
  };
}

// ============= LOCATION USAGE TRACKING (QUICK ACCESS) =============

export async function trackLocationUsage(
  userId: number,
  locationId: number
): Promise<void> {
  const database = getDB();

  // Check if already tracked
  const existing = await database.getFirstAsync<UserLocationUsage>(
    "SELECT * FROM UserLocationUsage WHERE user_id = ? AND location_id = ?",
    [userId, locationId]
  );

  if (existing) {
    // Update count and last used
    await database.runAsync(
      "UPDATE UserLocationUsage SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
      [existing.id]
    );
  } else {
    // Insert new
    await database.runAsync(
      "INSERT INTO UserLocationUsage (user_id, location_id, usage_count, last_used_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)",
      [userId, locationId]
    );
  }
}

export async function toggleLocationFavorite(
  userId: number,
  locationId: number,
  isFavorite: boolean
): Promise<void> {
  const database = getDB();

  const existing = await database.getFirstAsync<UserLocationUsage>(
    "SELECT * FROM UserLocationUsage WHERE user_id = ? AND location_id = ?",
    [userId, locationId]
  );

  if (existing) {
    await database.runAsync(
      "UPDATE UserLocationUsage SET is_favorite = ? WHERE id = ?",
      [isFavorite ? 1 : 0, existing.id]
    );
  } else {
    await database.runAsync(
      "INSERT INTO UserLocationUsage (user_id, location_id, usage_count, is_favorite) VALUES (?, ?, 0, ?)",
      [userId, locationId, isFavorite ? 1 : 0]
    );
  }
}

export async function getQuickAccessLocations(
  userId: number,
  limit: number = 5
): Promise<(Location & { usage_count: number; is_favorite: boolean })[]> {
  const database = getDB();

  const results = await database.getAllAsync<any>(
    `SELECT l.*, u.usage_count, u.is_favorite
     FROM UserLocationUsage u
     JOIN Location l ON l.id = u.location_id
     WHERE u.user_id = ? AND l.is_active = 1 AND l.deleted_at IS NULL
     ORDER BY u.is_favorite DESC, u.usage_count DESC, u.last_used_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return results.map((r) => ({
    ...r,
    is_transit: Boolean(r.is_transit),
    is_active: Boolean(r.is_active),
    is_favorite: Boolean(r.is_favorite),
  }));
}

// ============= CHANGE LOG (AUDIT TRAIL) =============

async function logChange(
  entityType: string,
  entityId: number | null,
  action: string,
  userId: number | null,
  oldValues: any = null,
  newValues: any = null
): Promise<void> {
  const database = getDB();
  const deviceInfo = await getDeviceInfo();
  const sessionId = getCurrentSessionId();

  // Get user name if userId provided
  let userName: string | null = null;
  if (userId) {
    const user = await database.getFirstAsync<User>("SELECT username FROM User WHERE id = ?", [userId]);
    userName = user?.username || null;
  }

  await database.runAsync(
    `INSERT INTO ChangeLog (entity_type, entity_id, action, user_id, user_name, old_values, new_values, app_version, session_id, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId,
      action,
      userId,
      userName,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      deviceInfo.appVersion,
      sessionId,
      null, // IP address - would need to be passed from UI
    ]
  );
}

export async function getChangeLogs(
  entityType?: string,
  entityId?: number,
  limit: number = 50
): Promise<ChangeLog[]> {
  const database = getDB();

  let query = "SELECT * FROM ChangeLog WHERE 1=1";
  const params: any[] = [];

  if (entityType) {
    query += " AND entity_type = ?";
    params.push(entityType);
  }

  if (entityId) {
    query += " AND entity_id = ?";
    params.push(entityId);
  }

  query += " ORDER BY timestamp DESC LIMIT ?";
  params.push(limit);

  return database.getAllAsync<ChangeLog>(query, params);
}

// ============= ITEM OPERATIONS (UNIFIED FOR COLLECTION & INVENTORY) =============

export async function getItemByInventoryNumber(
  inventoryNumber: string
): Promise<InventoryItem | null> {
  const database = getDB();
  const result = await database.getFirstAsync<InventoryItem>(
    "SELECT * FROM Item WHERE inventory_number = ? AND is_archived = 0 AND deleted_at IS NULL",
    [inventoryNumber]
  );
  if (!result) return null;
  return {
    ...result,
    is_archived: Boolean(result.is_archived),
  };
}

export async function getItemById(itemId: number): Promise<InventoryItem | null> {
  const database = getDB();
  const result = await database.getFirstAsync<InventoryItem>(
    "SELECT * FROM Item WHERE id = ? AND deleted_at IS NULL",
    [itemId]
  );
  if (!result) return null;
  return {
    ...result,
    is_archived: Boolean(result.is_archived),
  };
}

export async function searchItems(
  searchTerm: string,
  statusFilter?: ItemStatus,
  collectionId?: number
): Promise<InventoryItem[]> {
  const database = getDB();
  let query =
    "SELECT * FROM Item WHERE is_archived = 0 AND deleted_at IS NULL AND (inventory_number LIKE ? OR title LIKE ? OR description LIKE ? OR customer_name LIKE ?)";
  const params: any[] = [
    `%${searchTerm}%`,
    `%${searchTerm}%`,
    `%${searchTerm}%`,
    `%${searchTerm}%`,
  ];

  if (statusFilter) {
    query += " AND status = ?";
    params.push(statusFilter);
  }

  if (collectionId) {
    query += " AND collection_id = ?";
    params.push(collectionId);
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
    "SELECT * FROM Item WHERE current_location_id = ? AND is_archived = 0 AND deleted_at IS NULL ORDER BY created_at DESC",
    [locationId]
  );
  return result.map((item) => ({
    ...item,
    is_archived: Boolean(item.is_archived),
  }));
}

export async function getItemsByCollection(
  collectionId: number
): Promise<InventoryItem[]> {
  const database = getDB();
  const result = await database.getAllAsync<InventoryItem>(
    "SELECT * FROM Item WHERE collection_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    [collectionId]
  );
  return result.map((item) => ({
    ...item,
    is_archived: Boolean(item.is_archived),
  }));
}

export async function createItem(
  data: {
    inventory_number: string;
    title?: string;
    description?: string;
    artist_name?: string;
    customer_id?: number;
    customer_name?: string;
    collection_id?: number;
    status: ItemStatus;
    location_id: number;
    dimensions_length?: number;
    dimensions_width?: number;
    dimensions_height?: number;
    dimensions_unit?: string;
    estimated_value?: number;
    currency?: string;
    overall_condition?: string;
    condition_notes?: string;
    notes?: string;
  },
  userId: number | null
): Promise<number> {
  const database = getDB();

  // Get location path
  const location = await getLocationById(data.location_id);
  if (!location) throw new Error("Location not found");

  const uuid = generateUUID();

  // Create item
  const result = await database.runAsync(
    `INSERT INTO Item (
      uuid, inventory_number, title, description, artist_name,
      customer_id, customer_name, collection_id, status,
      current_location_id, current_location_path,
      dimensions_length, dimensions_width, dimensions_height, dimensions_unit,
      estimated_value, currency, overall_condition, condition_notes, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      data.inventory_number,
      data.title || null,
      data.description || null,
      data.artist_name || null,
      data.customer_id || null,
      data.customer_name || null,
      data.collection_id || null,
      data.status,
      data.location_id,
      location.full_path,
      data.dimensions_length || null,
      data.dimensions_width || null,
      data.dimensions_height || null,
      data.dimensions_unit || null,
      data.estimated_value || null,
      data.currency || null,
      data.overall_condition || null,
      data.condition_notes || null,
      data.notes || null,
      userId,
    ]
  );

  const itemId = result.lastInsertRowId;

  // Create history entry
  await addItemHistory(
    itemId,
    userId,
    "COLLECTED",
    null,
    location.full_path,
    null,
    data.status,
    `Item created: ${data.inventory_number}`
  );

  // Track location usage
  if (userId) {
    await trackLocationUsage(userId, data.location_id);
  }

  return itemId;
}

export async function updateItemLocation(
  itemId: number,
  newLocationId: number,
  newStatus: ItemStatus,
  userId: number | null
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
    "MOVED",
    item.current_location_path,
    newLocation.full_path,
    item.status,
    newStatus,
    null
  );

  // Track location usage
  if (userId) {
    await trackLocationUsage(userId, newLocationId);
  }
}

export async function updateItemStatus(
  itemId: number,
  newStatus: ItemStatus,
  userId: number | null
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
  userId: number | null
): Promise<void> {
  const database = getDB();

  // Update item notes
  await database.runAsync(
    "UPDATE Item SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [notes, itemId]
  );

  // Create history entry
  await addItemHistory(itemId, userId, "NOTE", null, null, null, null, notes);
}

// ============= ITEM HISTORY OPERATIONS =============

async function addItemHistory(
  itemId: number,
  userId: number | null,
  actionType: ActionType,
  fromLocationPath: string | null,
  toLocationPath: string | null,
  fromStatus: ItemStatus | null,
  toStatus: ItemStatus | null,
  notes: string | null
): Promise<number> {
  const database = getDB();
  const deviceInfo = await getDeviceInfo();
  const sessionId = getCurrentSessionId();

  // Get user name
  let userName: string | null = null;
  if (userId) {
    const user = await database.getFirstAsync<User>("SELECT username FROM User WHERE id = ?", [userId]);
    userName = user?.username || null;
  }

  const result = await database.runAsync(
    `INSERT INTO ItemHistory (
      item_id, user_id, user_name, action_type,
      from_location_path, to_location_path, from_status, to_status,
      notes, device_id, app_version, session_id, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      deviceInfo.deviceId,
      deviceInfo.appVersion,
      sessionId,
      null, // IP address
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

// Re-export types from old db.ts for compatibility
export type { User as UserOld } from "./db";
export { getUserById } from "./db";
