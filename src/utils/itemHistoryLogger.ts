// Utility functions for logging collection item photo and note changes to ItemHistory
// This provides a convenient wrapper around the inventory ItemHistory system for collection items

import * as SQLite from "expo-sqlite";

/**
 * Log a note change to ItemHistory
 * Maps collection item UUID to inventory item ID if it exists
 */
export async function logNoteChange(
  collectionItemUuid: string,
  userId: number | null,
  action: "NOTE_ADDED" | "NOTE_EDITED" | "NOTE_DELETED",
  photoId: string,
  noteContent?: string
): Promise<void> {
  try {
    const database = SQLite.openDatabaseSync("inventory.db");

    // Try to find corresponding inventory item
    const inventoryItem = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM Item WHERE inventory_number LIKE ?",
      [`%${collectionItemUuid}%`]
    );

    if (inventoryItem) {
      // Log to ItemHistory if inventory item exists
      await database.runAsync(
        `INSERT INTO ItemHistory (
          item_id, user_id, action_type, notes
        ) VALUES (?, ?, ?, ?)`,
        [
          inventoryItem.id,
          userId,
          action,
          `Photo ${photoId}: ${noteContent || "Note deleted"}`,
        ]
      );
    }

    console.log(`[HISTORY] Logged ${action} for collection item ${collectionItemUuid}`);
  } catch (error) {
    console.error("[HISTORY] Failed to log note change:", error);
    // Don't throw - history logging should not block user operations
  }
}

/**
 * Log a photo change to ItemHistory
 * Maps collection item UUID to inventory item ID if it exists
 */
export async function logPhotoChange(
  collectionItemUuid: string,
  userId: number | null,
  action: "PHOTO_ADDED" | "PHOTO_DELETED",
  photoDetails: string
): Promise<void> {
  try {
    const database = SQLite.openDatabaseSync("inventory.db");

    // Try to find corresponding inventory item
    const inventoryItem = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM Item WHERE inventory_number LIKE ?",
      [`%${collectionItemUuid}%`]
    );

    if (inventoryItem) {
      // Log to ItemHistory if inventory item exists
      await database.runAsync(
        `INSERT INTO ItemHistory (
          item_id, user_id, action_type, notes
        ) VALUES (?, ?, ?, ?)`,
        [
          inventoryItem.id,
          userId,
          action,
          photoDetails,
        ]
      );
    }

    console.log(`[HISTORY] Logged ${action} for collection item ${collectionItemUuid}`);
  } catch (error) {
    console.error("[HISTORY] Failed to log photo change:", error);
    // Don't throw - history logging should not block user operations
  }
}

/**
 * Get formatted photo details for history logging
 */
export function formatPhotoDetails(
  source: "collection_flow" | "added_later",
  hasGps: boolean,
  hasNotes: boolean
): string {
  const details: string[] = [];

  if (source === "added_later") {
    details.push("Added from Item Details");
  } else {
    details.push("From collection flow");
  }

  if (hasGps) {
    details.push("with GPS");
  }

  if (hasNotes) {
    details.push("with notes");
  }

  return details.join(", ");
}
