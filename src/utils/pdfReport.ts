import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import type { Collection } from "../types/collection";
import { buildCollectionSummary, formatNumber, formatCurrency } from "./collectionSummary";
import * as FileSystem from "expo-file-system";

/**
 * Generate and share PDF report for a collection
 */
export async function generateAndSharePDF(collection: Collection): Promise<void> {
  try {
    // Calculate summary
    const summary = buildCollectionSummary(collection);

    // Convert signature to base64 if exists
    let signatureBase64 = "";
    if (collection.signature?.signatureUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(collection.signature.signatureUri);
        if (fileInfo.exists) {
          signatureBase64 = await FileSystem.readAsStringAsync(collection.signature.signatureUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch (error) {
        console.warn("Signature unavailable for PDF");
      }
    }

    // Convert item photos to base64
    const itemsWithPhotos = await Promise.all(
      collection.items.map(async (item) => {
        const photos = await Promise.all(
          item.photos.slice(0, 3).map(async (photo) => {
            try {
              const imageUri = photo.annotatedImageUri || photo.uri;
              const fileInfo = await FileSystem.getInfoAsync(imageUri);
              if (fileInfo.exists) {
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                return `data:image/jpeg;base64,${base64}`;
              }
            } catch (error) {
              console.warn("Photo unavailable:", photo.id);
            }
            return null;
          })
        );
        return { ...item, photoData: photos.filter((p) => p !== null) };
      })
    );

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      padding: 20px;
      color: #1f2937;
      font-size: 11px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563eb;
    }
    .header h1 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .header p {
      font-size: 12px;
      color: #6b7280;
      margin: 2px 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .summary-item {
      padding: 10px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .summary-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    .summary-value {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }
    .data-quality {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 12px;
      margin-top: 15px;
    }
    .data-quality-title {
      font-weight: 600;
      color: #78350f;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .data-quality-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 10px;
      color: #92400e;
    }
    .item-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }
    .item-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 3px;
    }
    .item-id {
      font-size: 9px;
      color: #9ca3af;
    }
    .condition-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }
    .condition-excellent { background: #d1fae5; color: #065f46; }
    .condition-good { background: #dbeafe; color: #1e40af; }
    .condition-fair { background: #fef3c7; color: #92400e; }
    .condition-poor { background: #fee2e2; color: #991b1b; }
    .condition-damaged { background: #fecaca; color: #7f1d1d; }
    .item-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #f3f4f6;
    }
    .detail-item {
      font-size: 10px;
    }
    .detail-label {
      color: #6b7280;
      margin-bottom: 2px;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 500;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 10px 0;
    }
    .photo-grid img {
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .signature-section {
      margin-top: 30px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .signature-section h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #1f2937;
    }
    .signature-box {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px;
      background: white;
      margin-top: 10px;
    }
    .signature-box img {
      max-width: 300px;
      max-height: 100px;
    }
    .signature-info {
      margin-top: 8px;
      font-size: 10px;
      color: #6b7280;
    }
    .info-box {
      background: #f3f4f6;
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Collection Report</h1>
    <p><strong>${collection.customerName}</strong></p>
    <p>Collection ID: ${collection.displayId}</p>
    <p>${new Date(collection.collectionDate).toLocaleDateString()} • ${collection.employeeName}</p>
  </div>

  <div class="section">
    <h2 class="section-title">Collection Summary</h2>

    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Items</div>
        <div class="summary-value">${summary.totalItems}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Photos</div>
        <div class="summary-value">${summary.totalPhotos}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Value</div>
        <div class="summary-value">USD $${formatCurrency(summary.totalValue)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Status</div>
        <div class="summary-value">${collection.status === "signed" ? "Signed" : collection.status === "completed" ? "Completed" : "In Progress"}</div>
      </div>
      ${
        summary.totalWeightKg > 0
          ? `
      <div class="summary-item">
        <div class="summary-label">Total Weight</div>
        <div class="summary-value">${formatNumber(summary.totalWeightLb, 1)} lb / ${formatNumber(summary.totalWeightKg, 1)} kg</div>
      </div>
      `
          : ""
      }
      ${
        summary.totalVolumeFt3 > 0
          ? `
      <div class="summary-item">
        <div class="summary-label">Total Volume</div>
        <div class="summary-value">${formatNumber(summary.totalVolumeFt3, 2)} ft³ / ${formatNumber(summary.totalVolumeM3, 2)} m³</div>
      </div>
      `
          : ""
      }
    </div>

    <div class="data-quality">
      <div class="data-quality-title">Data Quality</div>
      <div class="data-quality-grid">
        <div>Items missing dimensions: <strong>${summary.itemsMissingDimensions}</strong></div>
        <div>Items missing weight: <strong>${summary.itemsMissingWeight}</strong></div>
        <div>Items with no photos: <strong>${summary.itemsWithNoPhotos}</strong></div>
        <div>Items missing value: <strong>${summary.itemsMissingValue}</strong></div>
      </div>
    </div>

    <div class="info-box">
      <div style="margin-bottom: 5px;"><strong>Pickup:</strong> ${collection.pickupAddress}</div>
      ${collection.deliveryAddress ? `<div><strong>Delivery:</strong> ${collection.deliveryAddress}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Items (${collection.items.length})</h2>
    ${itemsWithPhotos
      .map(
        (item, index) => `
      <div class="item-card">
        <div class="item-header">
          <div>
            <div class="item-title">${index + 1}. ${item.title}</div>
            ${item.artistName ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">by ${item.artistName}</div>` : ""}
            <div class="item-id">${item.displayId}</div>
          </div>
          <span class="condition-badge condition-${item.overallCondition.toLowerCase()}">${item.overallCondition}</span>
        </div>

        ${
          item.photoData.length > 0
            ? `
          <div class="photo-grid">
            ${item.photoData.map((photo) => `<img src="${photo}" alt="Item photo">`).join("")}
          </div>
        `
            : ""
        }

        <div class="item-details">
          <div class="detail-item">
            <div class="detail-label">Dimensions</div>
            <div class="detail-value">${item.dimensions.length} × ${item.dimensions.width} × ${item.dimensions.height} ${item.dimensions.unit}</div>
          </div>
          ${
            item.dimensions.weight
              ? `
          <div class="detail-item">
            <div class="detail-label">Weight</div>
            <div class="detail-value">${item.dimensions.weight} ${item.dimensions.weightUnit}</div>
          </div>
          `
              : ""
          }
          <div class="detail-item">
            <div class="detail-label">Value</div>
            <div class="detail-value">${item.currency} ${item.estimatedValue.toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Photos</div>
            <div class="detail-value">${item.photos.length} captured</div>
          </div>
        </div>

        ${item.description ? `<div style="margin-top: 10px; font-size: 10px; color: #4b5563;"><strong>Description:</strong> ${item.description}</div>` : ""}
        ${item.conditionNotes ? `<div style="margin-top: 5px; font-size: 10px; color: #4b5563;"><strong>Notes:</strong> ${item.conditionNotes}</div>` : ""}
      </div>
    `
      )
      .join("")}
  </div>

  ${
    collection.signature && signatureBase64
      ? `
  <div class="signature-section">
    <h3>Digital Signature</h3>
    <div class="signature-box">
      <img src="data:image/png;base64,${signatureBase64}" alt="Signature">
      <div class="signature-info">
        <div><strong>Signed by:</strong> ${collection.signature.signerName}</div>
        <div><strong>Role:</strong> ${collection.signature.signerRole}</div>
        <div><strong>Date:</strong> ${new Date(collection.signature.timestamp).toLocaleString()}</div>
      </div>
    </div>
  </div>
  `
      : ""
  }

  <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #9ca3af;">
    Generated on ${new Date().toLocaleString()}
  </div>
</body>
</html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({ html });

    // Share PDF
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Collection Report - ${collection.customerName}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("PDF Generated", `PDF saved to: ${uri}`);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    Alert.alert("Error", "Failed to generate PDF report");
  }
}
