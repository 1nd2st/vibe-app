// Collection database functions for SQLite
// Handles customers, collections, collection items, and photos
import * as SQLite from "expo-sqlite";
import type {
  Collection,
  CollectionItem,
  Customer,
  CustomerLocation,
  ItemPhoto,
  ItemDimensions,
  CollectionSignature,
} from "../types/collection";

// ============= DATABASE CONNECTION =============

let db: SQLite.SQLiteDatabase | null = null;

function getDB(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync("inventory.db");
  }
  return db;
}

// ============= HELPER FUNCTIONS =============

function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateShortId(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = letters.charAt(Math.floor(Math.random() * letters.length));
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${letter}${numbers}`;
}

// ============= CUSTOMER FUNCTIONS =============

export async function getAllCustomers(): Promise<Customer[]> {
  const database = getDB();
  const rows = await database.getAllAsync<any>(
    "SELECT * FROM Customer WHERE deleted_at IS NULL ORDER BY name ASC"
  );

  const customers: Customer[] = [];
  for (const row of rows) {
    const locations = await getCustomerLocations(row.id);
    customers.push({
      id: row.uuid,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      locations,
    });
  }

  return customers;
}

export async function getCustomerById(uuid: string): Promise<Customer | null> {
  const database = getDB();
  const row = await database.getFirstAsync<any>(
    "SELECT * FROM Customer WHERE uuid = ? AND deleted_at IS NULL",
    [uuid]
  );

  if (!row) return null;

  const locations = await getCustomerLocations(row.id);
  return {
    id: row.uuid,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    locations,
  };
}

export async function createCustomer(customerData: {
  name: string;
  address: string;
  phone: string;
  email: string;
}): Promise<string> {
  const database = getDB();
  const uuid = `CUST-${generateUUID()}`;

  await database.runAsync(
    `INSERT INTO Customer (uuid, name, address, phone, email)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid, customerData.name, customerData.address, customerData.phone, customerData.email]
  );

  return uuid;
}

export async function updateCustomer(
  uuid: string,
  updates: Partial<{ name: string; address: string; phone: string; email: string }>
): Promise<void> {
  const database = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.address !== undefined) {
    fields.push("address = ?");
    values.push(updates.address);
  }
  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    values.push(updates.phone);
  }
  if (updates.email !== undefined) {
    fields.push("email = ?");
    values.push(updates.email);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(uuid);

  await database.runAsync(
    `UPDATE Customer SET ${fields.join(", ")} WHERE uuid = ?`,
    values
  );
}

export async function deleteCustomer(uuid: string): Promise<void> {
  const database = getDB();
  await database.runAsync(
    "UPDATE Customer SET deleted_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [uuid]
  );
}

// ============= CUSTOMER LOCATION FUNCTIONS =============

export async function getCustomerLocations(customerId: number): Promise<CustomerLocation[]> {
  const database = getDB();
  const rows = await database.getAllAsync<any>(
    "SELECT * FROM CustomerLocation WHERE customer_id = ? ORDER BY is_default DESC, name ASC",
    [customerId]
  );

  return rows.map((row: any) => ({
    id: row.uuid,
    name: row.name,
    address: row.address,
    type: row.type as "pickup" | "delivery" | "both",
    isDefault: row.is_default === 1,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function addCustomerLocation(
  customerUuid: string,
  locationData: {
    name: string;
    address: string;
    type: "pickup" | "delivery" | "both";
    isDefault?: boolean;
  }
): Promise<string> {
  const database = getDB();

  // Get customer internal ID
  const customer = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM Customer WHERE uuid = ?",
    [customerUuid]
  );

  if (!customer) throw new Error("Customer not found");

  const uuid = `LOC-${generateUUID()}`;

  // If this is default, unset all others
  if (locationData.isDefault) {
    await database.runAsync(
      "UPDATE CustomerLocation SET is_default = 0 WHERE customer_id = ?",
      [customer.id]
    );
  }

  await database.runAsync(
    `INSERT INTO CustomerLocation (uuid, customer_id, name, address, type, is_default)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      customer.id,
      locationData.name,
      locationData.address,
      locationData.type,
      locationData.isDefault ? 1 : 0,
    ]
  );

  return uuid;
}

export async function updateCustomerLocation(
  customerUuid: string,
  locationUuid: string,
  updates: Partial<{
    name: string;
    address: string;
    type: "pickup" | "delivery" | "both";
    isDefault: boolean;
  }>
): Promise<void> {
  const database = getDB();

  // Get customer internal ID
  const customer = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM Customer WHERE uuid = ?",
    [customerUuid]
  );

  if (!customer) throw new Error("Customer not found");

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.address !== undefined) {
    fields.push("address = ?");
    values.push(updates.address);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.isDefault !== undefined) {
    // If setting as default, unset all others first
    if (updates.isDefault) {
      await database.runAsync(
        "UPDATE CustomerLocation SET is_default = 0 WHERE customer_id = ?",
        [customer.id]
      );
    }
    fields.push("is_default = ?");
    values.push(updates.isDefault ? 1 : 0);
  }

  if (fields.length === 0) return;

  values.push(locationUuid);

  await database.runAsync(
    `UPDATE CustomerLocation SET ${fields.join(", ")} WHERE uuid = ?`,
    values
  );
}

export async function deleteCustomerLocation(
  _customerUuid: string,
  locationUuid: string
): Promise<void> {
  const database = getDB();
  await database.runAsync(
    "DELETE FROM CustomerLocation WHERE uuid = ?",
    [locationUuid]
  );
}

// ============= COLLECTION FUNCTIONS =============

export async function getAllCollections(): Promise<Collection[]> {
  const database = getDB();
  const rows = await database.getAllAsync<any>(
    `SELECT c.*, cust.uuid as customer_uuid
     FROM Collection c
     LEFT JOIN Customer cust ON c.customer_id = cust.id
     WHERE c.deleted_at IS NULL
     ORDER BY c.collection_date DESC, c.created_at DESC`
  );

  const collections: Collection[] = [];
  for (const row of rows) {
    const items = await getCollectionItems(row.id);
    collections.push(mapRowToCollection(row, items));
  }

  return collections;
}

export async function getCollectionByUuid(uuid: string): Promise<Collection | null> {
  const database = getDB();
  const row = await database.getFirstAsync<any>(
    `SELECT c.*, cust.uuid as customer_uuid
     FROM Collection c
     LEFT JOIN Customer cust ON c.customer_id = cust.id
     WHERE c.uuid = ? AND c.deleted_at IS NULL`,
    [uuid]
  );

  if (!row) return null;

  const items = await getCollectionItems(row.id);
  return mapRowToCollection(row, items);
}

export async function createCollection(collectionData: {
  customerId: string;
  customerName: string;
  collectionDate: number;
  pickupAddress: string;
  deliveryAddress?: string;
  employeeName: string;
  notes?: string;
}): Promise<string> {
  const database = getDB();

  // Get customer internal ID
  const customer = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM Customer WHERE uuid = ?",
    [collectionData.customerId]
  );

  if (!customer) throw new Error("Customer not found");

  const uuid = `COL-${generateUUID()}`;
  const displayId = generateShortId();

  await database.runAsync(
    `INSERT INTO Collection (
      uuid, display_id, customer_id, customer_name, collection_date,
      pickup_address, delivery_address, employee_name, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      displayId,
      customer.id,
      collectionData.customerName,
      collectionData.collectionDate,
      collectionData.pickupAddress,
      collectionData.deliveryAddress || null,
      collectionData.employeeName,
      collectionData.notes || null,
      "in_progress",
    ]
  );

  return uuid;
}

export async function updateCollection(
  uuid: string,
  updates: Partial<{
    customerId: string;
    customerName: string;
    collectionDate: number;
    status: "in_progress" | "completed" | "signed";
    pickupAddress: string;
    deliveryAddress: string;
    employeeName: string;
    notes: string;
  }>
): Promise<void> {
  const database = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.customerName !== undefined) {
    fields.push("customer_name = ?");
    values.push(updates.customerName);
  }
  if (updates.collectionDate !== undefined) {
    fields.push("collection_date = ?");
    values.push(updates.collectionDate);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.pickupAddress !== undefined) {
    fields.push("pickup_address = ?");
    values.push(updates.pickupAddress);
  }
  if (updates.deliveryAddress !== undefined) {
    fields.push("delivery_address = ?");
    values.push(updates.deliveryAddress);
  }
  if (updates.employeeName !== undefined) {
    fields.push("employee_name = ?");
    values.push(updates.employeeName);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(uuid);

  await database.runAsync(
    `UPDATE Collection SET ${fields.join(", ")} WHERE uuid = ?`,
    values
  );
}

export async function deleteCollection(uuid: string): Promise<void> {
  const database = getDB();
  await database.runAsync(
    "UPDATE Collection SET deleted_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [uuid]
  );
}

export async function signCollection(
  uuid: string,
  signature: CollectionSignature
): Promise<void> {
  const database = getDB();
  await database.runAsync(
    `UPDATE Collection SET
      signature_uri = ?,
      signer_name = ?,
      signer_role = ?,
      signature_timestamp = ?,
      status = 'signed',
      updated_at = CURRENT_TIMESTAMP
     WHERE uuid = ?`,
    [
      signature.signatureUri,
      signature.signerName,
      signature.signerRole,
      signature.timestamp,
      uuid,
    ]
  );
}

// ============= COLLECTION ITEM FUNCTIONS =============

async function getCollectionItems(collectionId: number): Promise<CollectionItem[]> {
  const database = getDB();
  const rows = await database.getAllAsync<any>(
    "SELECT * FROM CollectionItem WHERE collection_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
    [collectionId]
  );

  const items: CollectionItem[] = [];
  for (const row of rows) {
    const photos = await getCollectionItemPhotos(row.id);
    items.push(mapRowToCollectionItem(row, photos));
  }

  return items;
}

export async function getCollectionItemByUuid(uuid: string): Promise<CollectionItem | null> {
  const database = getDB();
  const row = await database.getFirstAsync<any>(
    "SELECT * FROM CollectionItem WHERE uuid = ? AND deleted_at IS NULL",
    [uuid]
  );

  if (!row) return null;

  const photos = await getCollectionItemPhotos(row.id);
  return mapRowToCollectionItem(row, photos);
}

export async function addCollectionItem(
  collectionUuid: string,
  itemData: {
    title: string;
    description: string;
    artistName?: string;
    dimensions: ItemDimensions;
    estimatedValue: number;
    currency: "USD" | "EUR" | "GBP";
    overallCondition: "Excellent" | "Good" | "Fair" | "Poor" | "Damaged";
    conditionNotes: string;
    photos: Omit<ItemPhoto, "id">[];
  }
): Promise<string> {
  const database = getDB();

  // Get collection internal ID and info
  const collection = await database.getFirstAsync<{ id: number; display_id: string; customer_id: number }>(
    "SELECT id, display_id, customer_id FROM Collection WHERE uuid = ?",
    [collectionUuid]
  );

  if (!collection) throw new Error("Collection not found");

  // Get customer name
  const customer = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM Customer WHERE id = ?",
    [collection.customer_id]
  );

  // Count existing items to generate display ID
  const countResult = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM CollectionItem WHERE collection_id = ?",
    [collection.id]
  );

  const itemNumber = (countResult?.count || 0) + 1;
  const uuid = `ITEM-${generateUUID()}`;
  const displayId = `${collection.display_id}-${itemNumber.toString().padStart(2, "0")}`;

  // Generate inventory number for unified tracking
  const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
  const itemCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM Item WHERE inventory_number LIKE ?",
    [`INV-${yearMonth}-%`]
  );
  const invNumber = (itemCount?.count || 0) + 1;
  const inventoryNumber = `INV-${yearMonth}-${invNumber.toString().padStart(5, "0")}`;

  // Get Transit Room location
  const transitLocation = await database.getFirstAsync<{ id: number; full_path: string }>(
    "SELECT id, full_path FROM Location WHERE is_transit = 1 AND is_active = 1 LIMIT 1"
  );

  if (!transitLocation) {
    throw new Error("Transit location not found. Please create a Transit Room location first.");
  }

  // 1. Insert CollectionItem
  await database.runAsync(
    `INSERT INTO CollectionItem (
      uuid, display_id, collection_id, title, description, artist_name,
      dimensions_length, dimensions_width, dimensions_height, dimensions_unit,
      weight, weight_unit, estimated_value, currency, overall_condition, condition_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      displayId,
      collection.id,
      itemData.title,
      itemData.description,
      itemData.artistName || null,
      itemData.dimensions.length,
      itemData.dimensions.width,
      itemData.dimensions.height,
      itemData.dimensions.unit,
      itemData.dimensions.weight || null,
      itemData.dimensions.weightUnit || null,
      itemData.estimatedValue,
      itemData.currency,
      itemData.overallCondition,
      itemData.conditionNotes,
    ]
  );

  // 2. Insert Item record for Inventory Management
  const itemUuidForInventory = `ITM-${generateUUID()}`;
  await database.runAsync(
    `INSERT INTO Item (
      uuid, inventory_number, title, description, artist_name,
      customer_id, customer_name, collection_id,
      status, current_location_id, current_location_path,
      dimensions_length, dimensions_width, dimensions_height, dimensions_unit,
      estimated_value, currency, overall_condition, condition_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      itemUuidForInventory,
      inventoryNumber,
      itemData.title,
      itemData.description,
      itemData.artistName || null,
      collection.customer_id,
      customer?.name || null,
      collection.id,
      "In transit",
      transitLocation.id,
      transitLocation.full_path,
      itemData.dimensions.length,
      itemData.dimensions.width,
      itemData.dimensions.height,
      itemData.dimensions.unit,
      itemData.estimatedValue,
      itemData.currency,
      itemData.overallCondition,
      itemData.conditionNotes,
    ]
  );

  // 3. Record COLLECTED action in ItemHistory
  const itemRow = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM Item WHERE uuid = ?",
    [itemUuidForInventory]
  );

  if (itemRow) {
    await database.runAsync(
      `INSERT INTO ItemHistory (
        item_id, action_type, to_location_path, to_status, notes
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        itemRow.id,
        "COLLECTED",
        transitLocation.full_path,
        "In transit",
        `Collected as part of ${collection.display_id} - ${itemData.title}`,
      ]
    );
  }

  // 4. Add photos to CollectionItem
  const collectionItemRow = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM CollectionItem WHERE uuid = ?",
    [uuid]
  );

  if (collectionItemRow && itemData.photos.length > 0) {
    for (const photo of itemData.photos) {
      await addCollectionItemPhoto(collectionItemRow.id, photo);
    }
  }

  // 5. Update collection timestamp
  await database.runAsync(
    "UPDATE Collection SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [collection.id]
  );

  return uuid;
}

export async function updateCollectionItem(
  uuid: string,
  updates: Partial<{
    title: string;
    description: string;
    artistName: string;
    dimensions: ItemDimensions;
    estimatedValue: number;
    currency: "USD" | "EUR" | "GBP";
    overallCondition: "Excellent" | "Good" | "Fair" | "Poor" | "Damaged";
    conditionNotes: string;
  }>
): Promise<void> {
  const database = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    fields.push("title = ?");
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.artistName !== undefined) {
    fields.push("artist_name = ?");
    values.push(updates.artistName);
  }
  if (updates.dimensions !== undefined) {
    fields.push("dimensions_length = ?");
    values.push(updates.dimensions.length);
    fields.push("dimensions_width = ?");
    values.push(updates.dimensions.width);
    fields.push("dimensions_height = ?");
    values.push(updates.dimensions.height);
    fields.push("dimensions_unit = ?");
    values.push(updates.dimensions.unit);
    if (updates.dimensions.weight !== undefined) {
      fields.push("weight = ?");
      values.push(updates.dimensions.weight);
    }
    if (updates.dimensions.weightUnit !== undefined) {
      fields.push("weight_unit = ?");
      values.push(updates.dimensions.weightUnit);
    }
  }
  if (updates.estimatedValue !== undefined) {
    fields.push("estimated_value = ?");
    values.push(updates.estimatedValue);
  }
  if (updates.currency !== undefined) {
    fields.push("currency = ?");
    values.push(updates.currency);
  }
  if (updates.overallCondition !== undefined) {
    fields.push("overall_condition = ?");
    values.push(updates.overallCondition);
  }
  if (updates.conditionNotes !== undefined) {
    fields.push("condition_notes = ?");
    values.push(updates.conditionNotes);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(uuid);

  await database.runAsync(
    `UPDATE CollectionItem SET ${fields.join(", ")} WHERE uuid = ?`,
    values
  );
}

export async function deleteCollectionItem(uuid: string): Promise<void> {
  const database = getDB();
  await database.runAsync(
    "UPDATE CollectionItem SET deleted_at = CURRENT_TIMESTAMP WHERE uuid = ?",
    [uuid]
  );
}

// ============= COLLECTION ITEM PHOTO FUNCTIONS =============

async function getCollectionItemPhotos(collectionItemId: number): Promise<ItemPhoto[]> {
  const database = getDB();
  const rows = await database.getAllAsync<any>(
    "SELECT * FROM CollectionItemPhoto WHERE collection_item_id = ? ORDER BY timestamp ASC",
    [collectionItemId]
  );

  return rows.map((row: any) => ({
    id: row.uuid,
    uri: row.uri,
    timestamp: row.timestamp,
    conditionNotes: row.condition_notes,
    aiDetectedDamage: row.ai_detected_damage,
    aiAnalyzed: row.ai_analyzed === 1,
    annotationData: row.annotation_data,
    annotatedImageUri: row.annotated_image_uri,
    latitude: row.latitude,
    longitude: row.longitude,
    source: (row.source || "collection_flow") as "collection_flow" | "added_later",
    isLocked: row.is_locked === 1,
    originalNote: row.original_note,
    noteEditedAt: row.note_edited_at,
    noteEditedBy: row.note_edited_by,
  }));
}

async function addCollectionItemPhoto(
  collectionItemId: number,
  photoData: Omit<ItemPhoto, "id">
): Promise<string> {
  const database = getDB();
  const uuid = `PHOTO-${generateUUID()}`;

  await database.runAsync(
    `INSERT INTO CollectionItemPhoto (
      uuid, collection_item_id, uri, timestamp, condition_notes,
      ai_detected_damage, ai_analyzed, annotation_data, annotated_image_uri,
      latitude, longitude, source, is_locked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      collectionItemId,
      photoData.uri,
      photoData.timestamp,
      photoData.conditionNotes || null,
      photoData.aiDetectedDamage || null,
      photoData.aiAnalyzed ? 1 : 0,
      photoData.annotationData || null,
      photoData.annotatedImageUri || null,
      photoData.latitude || null,
      photoData.longitude || null,
      photoData.source || "collection_flow",
      photoData.isLocked ? 1 : 0,
    ]
  );

  return uuid;
}

export async function addPhotoToCollectionItem(
  itemUuid: string,
  photoData: Omit<ItemPhoto, "id">
): Promise<string> {
  const database = getDB();

  // Get item internal ID
  const item = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM CollectionItem WHERE uuid = ?",
    [itemUuid]
  );

  if (!item) throw new Error("Collection item not found");

  return await addCollectionItemPhoto(item.id, photoData);
}

export async function updateCollectionItemPhoto(
  photoUuid: string,
  updates: Partial<{
    conditionNotes: string;
    aiDetectedDamage: string;
    aiAnalyzed: boolean;
    annotationData: string;
    annotatedImageUri: string;
  }>
): Promise<void> {
  const database = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.conditionNotes !== undefined) {
    fields.push("condition_notes = ?");
    values.push(updates.conditionNotes);
  }
  if (updates.aiDetectedDamage !== undefined) {
    fields.push("ai_detected_damage = ?");
    values.push(updates.aiDetectedDamage);
  }
  if (updates.aiAnalyzed !== undefined) {
    fields.push("ai_analyzed = ?");
    values.push(updates.aiAnalyzed ? 1 : 0);
  }
  if (updates.annotationData !== undefined) {
    fields.push("annotation_data = ?");
    values.push(updates.annotationData);
  }
  if (updates.annotatedImageUri !== undefined) {
    fields.push("annotated_image_uri = ?");
    values.push(updates.annotatedImageUri);
  }

  if (fields.length === 0) return;

  values.push(photoUuid);

  await database.runAsync(
    `UPDATE CollectionItemPhoto SET ${fields.join(", ")} WHERE uuid = ?`,
    values
  );
}

export async function deleteCollectionItemPhoto(photoUuid: string): Promise<void> {
  const database = getDB();
  await database.runAsync(
    "DELETE FROM CollectionItemPhoto WHERE uuid = ?",
    [photoUuid]
  );
}

// ============= MAPPER FUNCTIONS =============

function mapRowToCollection(row: any, items: CollectionItem[]): Collection {
  const collection: Collection = {
    id: row.uuid,
    displayId: row.display_id,
    customerId: row.customer_uuid || "",
    customerName: row.customer_name,
    collectionDate: row.collection_date,
    status: row.status,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    items,
    employeeName: row.employee_name,
    notes: row.notes,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };

  if (row.signature_uri) {
    collection.signature = {
      signatureUri: row.signature_uri,
      signerName: row.signer_name,
      signerRole: row.signer_role,
      timestamp: row.signature_timestamp,
    };
  }

  return collection;
}

function mapRowToCollectionItem(row: any, photos: ItemPhoto[]): CollectionItem {
  return {
    id: row.uuid,
    displayId: row.display_id,
    collectionId: "", // Will be mapped from parent
    title: row.title,
    description: row.description,
    artistName: row.artist_name,
    dimensions: {
      length: row.dimensions_length,
      width: row.dimensions_width,
      height: row.dimensions_height,
      unit: row.dimensions_unit,
      weight: row.weight,
      weightUnit: row.weight_unit,
    },
    estimatedValue: row.estimated_value,
    currency: row.currency,
    photos,
    overallCondition: row.overall_condition,
    conditionNotes: row.condition_notes,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
