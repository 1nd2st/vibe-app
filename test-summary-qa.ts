/**
 * Test script to verify collection summary calculations
 * Run this on the device to get real QA numbers
 */

import { openDatabaseSync } from "expo-sqlite";
import { buildCollectionSummary } from "./src/utils/collectionSummary";
import type { Collection, CollectionItem } from "./src/types/collection";

async function testCollectionSummary() {
  const db = openDatabaseSync("inventory.db");

  // Get all collections
  const collections = await db.getAllAsync<any>(
    "SELECT * FROM Collection WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5"
  );

  console.log("\n=== AVAILABLE COLLECTIONS ===");
  for (const col of collections) {
    console.log(`\nCollection: ${col.display_id}`);
    console.log(`  Customer: ${col.customer_name}`);
    console.log(`  Status: ${col.status}`);
  }

  if (collections.length === 0) {
    console.log("\n❌ No collections found in database!");
    return;
  }

  // Pick first collection for detailed QA
  const testCollection = collections[0];
  console.log(`\n\n=== QA FOR COLLECTION: ${testCollection.display_id} ===`);

  // Get all items for this collection
  const items = await db.getAllAsync<any>(
    "SELECT * FROM CollectionItem WHERE collection_id = ? AND deleted_at IS NULL",
    [testCollection.id]
  );

  console.log(`\nTotal items in DB: ${items.length}`);

  // Get photos for each item
  let totalPhotosManual = 0;
  let totalValueManual = 0;
  let totalWeightKgManual = 0;
  let totalVolumeCm3Manual = 0;
  let itemsMissingDimensionsManual = 0;
  let itemsMissingWeightManual = 0;
  let itemsWithNoPhotosManual = 0;
  let itemsMissingValueManual = 0;

  console.log("\n--- ITEM BY ITEM BREAKDOWN ---");
  for (const item of items) {
    console.log(`\nItem: ${item.display_id} - ${item.title}`);

    // Photos
    const photos = await db.getAllAsync<any>(
      "SELECT * FROM CollectionItemPhoto WHERE collection_item_id = ?",
      [item.id]
    );
    const photoCount = photos.length;
    totalPhotosManual += photoCount;
    console.log(`  Photos: ${photoCount}`);
    if (photoCount === 0) itemsWithNoPhotosManual++;

    // Value
    if (item.estimated_value != null && item.estimated_value > 0) {
      totalValueManual += item.estimated_value;
      console.log(`  Value: ${item.currency} ${item.estimated_value}`);
    } else {
      itemsMissingValueManual++;
      console.log(`  Value: MISSING`);
    }

    // Weight
    if (item.weight != null && item.weight > 0) {
      let weightKg = item.weight;
      if (item.weight_unit === "lb") {
        weightKg = item.weight / 2.20462;
      }
      totalWeightKgManual += weightKg;
      console.log(`  Weight: ${item.weight} ${item.weight_unit} (${weightKg.toFixed(2)} kg)`);
    } else {
      itemsMissingWeightManual++;
      console.log(`  Weight: MISSING`);
    }

    // Dimensions and Volume
    if (item.dimensions_length && item.dimensions_width && item.dimensions_height) {
      let volumeCm3: number;
      if (item.dimensions_unit === "in") {
        const volumeIn3 = item.dimensions_length * item.dimensions_width * item.dimensions_height;
        volumeCm3 = volumeIn3 * 16.387064;
        console.log(
          `  Dimensions: ${item.dimensions_length} × ${item.dimensions_width} × ${item.dimensions_height} in`
        );
        console.log(`  Volume: ${volumeIn3.toFixed(2)} in³ = ${volumeCm3.toFixed(2)} cm³`);
      } else {
        volumeCm3 = item.dimensions_length * item.dimensions_width * item.dimensions_height;
        console.log(
          `  Dimensions: ${item.dimensions_length} × ${item.dimensions_width} × ${item.dimensions_height} cm`
        );
        console.log(`  Volume: ${volumeCm3.toFixed(2)} cm³`);
      }
      totalVolumeCm3Manual += volumeCm3;
    } else {
      itemsMissingDimensionsManual++;
      console.log(`  Dimensions: MISSING`);
    }
  }

  // Calculate totals
  const totalWeightLbManual = totalWeightKgManual * 2.20462;
  const totalVolumeM3Manual = totalVolumeCm3Manual / 1_000_000;
  const totalVolumeIn3Manual = totalVolumeCm3Manual / 16.387064;
  const totalVolumeFt3Manual = totalVolumeIn3Manual / 1728;

  console.log("\n\n=== MANUAL CALCULATIONS ===");
  console.log(`Total items: ${items.length}`);
  console.log(`Total photos: ${totalPhotosManual}`);
  console.log(`Total value: USD $${totalValueManual.toFixed(2)}`);
  console.log(`Total weight: ${totalWeightLbManual.toFixed(1)} lb / ${totalWeightKgManual.toFixed(1)} kg`);
  console.log(`Total volume: ${totalVolumeFt3Manual.toFixed(2)} ft³ / ${totalVolumeM3Manual.toFixed(2)} m³`);
  console.log("\nData Quality:");
  console.log(`  Items missing dimensions: ${itemsMissingDimensionsManual}`);
  console.log(`  Items missing weight: ${itemsMissingWeightManual}`);
  console.log(`  Items with no photos: ${itemsWithNoPhotosManual}`);
  console.log(`  Items missing value: ${itemsMissingValueManual}`);

  // Now test with the actual helper function
  // Build a full Collection object
  const fullCollection: Collection = {
    id: testCollection.uuid,
    displayId: testCollection.display_id,
    customerId: testCollection.customer_id,
    customerName: testCollection.customer_name,
    collectionDate: testCollection.collection_date,
    status: testCollection.status,
    pickupAddress: testCollection.pickup_address,
    deliveryAddress: testCollection.delivery_address,
    employeeName: testCollection.employee_name,
    notes: testCollection.notes,
    createdAt: Date.parse(testCollection.created_at),
    updatedAt: Date.parse(testCollection.updated_at),
    items: await Promise.all(
      items.map(async (item: any) => {
        const photos = await db.getAllAsync<any>(
          "SELECT * FROM CollectionItemPhoto WHERE collection_item_id = ?",
          [item.id]
        );

        return {
          id: item.uuid,
          displayId: item.display_id,
          collectionId: testCollection.uuid,
          title: item.title,
          description: item.description,
          artistName: item.artist_name,
          dimensions: {
            length: item.dimensions_length || 0,
            width: item.dimensions_width || 0,
            height: item.dimensions_height || 0,
            unit: item.dimensions_unit || "cm",
            weight: item.weight,
            weightUnit: item.weight_unit,
          },
          estimatedValue: item.estimated_value || 0,
          currency: item.currency || "USD",
          photos: photos.map((p: any) => ({
            id: p.uuid,
            uri: p.uri,
            timestamp: p.timestamp,
            conditionNotes: p.condition_notes,
            aiDetectedDamage: p.ai_detected_damage,
            aiAnalyzed: p.ai_analyzed === 1,
            annotationData: p.annotation_data,
            annotatedImageUri: p.annotated_image_uri,
          })),
          overallCondition: item.overall_condition,
          conditionNotes: item.condition_notes,
          createdAt: Date.parse(item.created_at),
          updatedAt: Date.parse(item.updated_at),
        } as CollectionItem;
      })
    ),
  };

  const summary = buildCollectionSummary(fullCollection);

  console.log("\n\n=== HELPER FUNCTION OUTPUT ===");
  console.log(`Total items: ${summary.totalItems}`);
  console.log(`Total photos: ${summary.totalPhotos}`);
  console.log(`Total value: USD $${summary.totalValue.toFixed(2)}`);
  console.log(`Total weight: ${summary.totalWeightLb.toFixed(1)} lb / ${summary.totalWeightKg.toFixed(1)} kg`);
  console.log(`Total volume: ${summary.totalVolumeFt3.toFixed(2)} ft³ / ${summary.totalVolumeM3.toFixed(2)} m³`);
  console.log("\nData Quality:");
  console.log(`  Items missing dimensions: ${summary.itemsMissingDimensions}`);
  console.log(`  Items missing weight: ${summary.itemsMissingWeight}`);
  console.log(`  Items with no photos: ${summary.itemsWithNoPhotos}`);
  console.log(`  Items missing value: ${summary.itemsMissingValue}`);

  console.log("\n\n=== VERIFICATION ===");
  console.log(`Total items: ${items.length} = ${summary.totalItems} → ${items.length === summary.totalItems ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Total photos: ${totalPhotosManual} = ${summary.totalPhotos} → ${totalPhotosManual === summary.totalPhotos ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Total value: ${totalValueManual.toFixed(2)} = ${summary.totalValue.toFixed(2)} → ${Math.abs(totalValueManual - summary.totalValue) < 0.01 ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Total weight (kg): ${totalWeightKgManual.toFixed(1)} = ${summary.totalWeightKg.toFixed(1)} → ${Math.abs(totalWeightKgManual - summary.totalWeightKg) < 0.1 ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Total weight (lb): ${totalWeightLbManual.toFixed(1)} = ${summary.totalWeightLb.toFixed(1)} → ${Math.abs(totalWeightLbManual - summary.totalWeightLb) < 0.1 ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Total volume (cm³): ${totalVolumeCm3Manual.toFixed(2)} = ${(summary.totalVolumeM3 * 1000000).toFixed(2)} → ${Math.abs(totalVolumeCm3Manual - summary.totalVolumeM3 * 1000000) < 1 ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Total volume (ft³): ${totalVolumeFt3Manual.toFixed(2)} = ${summary.totalVolumeFt3.toFixed(2)} → ${Math.abs(totalVolumeFt3Manual - summary.totalVolumeFt3) < 0.01 ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Missing dimensions: ${itemsMissingDimensionsManual} = ${summary.itemsMissingDimensions} → ${itemsMissingDimensionsManual === summary.itemsMissingDimensions ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Missing weight: ${itemsMissingWeightManual} = ${summary.itemsMissingWeight} → ${itemsMissingWeightManual === summary.itemsMissingWeight ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`No photos: ${itemsWithNoPhotosManual} = ${summary.itemsWithNoPhotos} → ${itemsWithNoPhotosManual === summary.itemsWithNoPhotos ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`Missing value: ${itemsMissingValueManual} = ${summary.itemsMissingValue} → ${itemsMissingValueManual === summary.itemsMissingValue ? "✅ MATCH" : "❌ MISMATCH"}`);
}

// This script should be run on the device via console or logging
testCollectionSummary().catch(console.error);
