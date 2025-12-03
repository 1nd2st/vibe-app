import type { Collection, CollectionItem } from "../types/collection";

export interface CollectionSummary {
  // Basic totals
  totalItems: number;
  totalPhotos: number;
  totalValue: number;

  // Weight (imperial primary)
  totalWeightLb: number;
  totalWeightKg: number;

  // Volume (imperial primary)
  totalVolumeFt3: number;
  totalVolumeM3: number;

  // Data quality metrics
  itemsMissingDimensions: number;
  itemsMissingWeight: number;
  itemsWithNoPhotos: number;
  itemsMissingValue: number;
}

/**
 * Calculate comprehensive summary statistics for a collection
 * including totals, weight, volume, and data quality metrics
 */
export function buildCollectionSummary(collection: Collection): CollectionSummary {
  const items = collection.items;

  // Initialize counters
  let totalPhotos = 0;
  let totalValue = 0;
  let totalWeightKg = 0;
  let totalVolumeCm3 = 0;

  let itemsMissingDimensions = 0;
  let itemsMissingWeight = 0;
  let itemsWithNoPhotos = 0;
  let itemsMissingValue = 0;

  // Process each item
  for (const item of items) {
    // Count photos
    totalPhotos += item.photos?.length || 0;

    // Check if item has no photos
    if (!item.photos || item.photos.length === 0) {
      itemsWithNoPhotos++;
    }

    // Sum value (convert to USD if needed)
    if (item.estimatedValue != null && item.estimatedValue > 0) {
      let valueInUSD = item.estimatedValue;
      if (item.currency === "EUR") {
        valueInUSD = item.estimatedValue * 1.1; // Approximate conversion
      } else if (item.currency === "GBP") {
        valueInUSD = item.estimatedValue * 1.25; // Approximate conversion
      }
      totalValue += valueInUSD;
    } else {
      itemsMissingValue++;
    }

    // Process weight
    if (item.dimensions?.weight != null && item.dimensions.weight > 0) {
      // Convert to kg if needed
      let weightKg = item.dimensions.weight;
      if (item.dimensions.weightUnit === "lb") {
        weightKg = item.dimensions.weight / 2.20462;
      }
      totalWeightKg += weightKg;
    } else {
      itemsMissingWeight++;
    }

    // Process dimensions and calculate volume
    const dims = item.dimensions;
    if (dims?.length != null && dims?.width != null && dims?.height != null &&
        dims.length > 0 && dims.width > 0 && dims.height > 0) {

      // Convert to cm if needed
      let lengthCm = dims.length;
      let widthCm = dims.width;
      let heightCm = dims.height;

      if (dims.unit === "in") {
        lengthCm = dims.length * 2.54;
        widthCm = dims.width * 2.54;
        heightCm = dims.height * 2.54;
      }

      // Calculate volume in cm³
      const volumeCm3 = lengthCm * widthCm * heightCm;
      totalVolumeCm3 += volumeCm3;
    } else {
      itemsMissingDimensions++;
    }
  }

  // Convert weight: kg to lb
  const totalWeightLb = totalWeightKg * 2.20462;

  // Convert volume: cm³ → m³ and ft³
  const totalVolumeM3 = totalVolumeCm3 / 1_000_000; // 1,000,000 cm³ = 1 m³
  const totalVolumeIn3 = totalVolumeCm3 / 16.387064; // 1 in³ = 16.387064 cm³
  const totalVolumeFt3 = totalVolumeIn3 / 1728; // 1728 in³ = 1 ft³

  return {
    totalItems: items.length,
    totalPhotos,
    totalValue,
    totalWeightLb,
    totalWeightKg,
    totalVolumeFt3,
    totalVolumeM3,
    itemsMissingDimensions,
    itemsMissingWeight,
    itemsWithNoPhotos,
    itemsMissingValue,
  };
}

/**
 * Format a number with specified decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
