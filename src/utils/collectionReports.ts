import * as MailComposer from "expo-mail-composer";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import type { Collection } from "../types/collection";

/**
 * Generate HTML report with embedded images
 */
export const generateCollectionHTML = async (collection: Collection): Promise<{ html: string; hasMissingFiles: boolean }> => {
  const totalValue = collection.items.reduce((sum, item) => {
    const valueInUSD = item.currency === "USD" ? item.estimatedValue :
                       item.currency === "EUR" ? item.estimatedValue * 1.1 :
                       item.estimatedValue * 1.25;
    return sum + valueInUSD;
  }, 0);

  const totalPhotos = collection.items.reduce((sum, item) => sum + item.photos.length, 0);

  // Convert signature to base64 if exists
  let signatureBase64 = "";
  let signatureMissing = false;
  if (collection.signature?.signatureUri) {
    try {
      // Check if signature file exists
      const fileInfo = await FileSystem.getInfoAsync(collection.signature.signatureUri);
      if (fileInfo.exists) {
        signatureBase64 = await FileSystem.readAsStringAsync(collection.signature.signatureUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        console.warn("Signature file not found (may have been signed before storage fix)");
        signatureMissing = true;
      }
    } catch (error) {
      console.warn("Signature unavailable (may have been signed before storage fix)");
      signatureMissing = true;
    }
  }

  // Convert images to base64 for embedding
  let totalPhotosMissing = 0;
  const itemsWithBase64Photos = await Promise.all(
    collection.items.map(async (item) => {
      const photosBase64 = await Promise.all(
        item.photos.map(async (photo) => { // Remove .slice(0, 4) to include ALL photos
          try {
            // Use annotated image if available, otherwise use original
            const imageUri = photo.annotatedImageUri || photo.uri;

            // Check if file exists before trying to read it
            const fileInfo = await FileSystem.getInfoAsync(imageUri);
            if (!fileInfo.exists) {
              console.warn(`Photo file not found: ${imageUri}`);
              totalPhotosMissing++;
              return null;
            }

            const base64 = await FileSystem.readAsStringAsync(imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Parse annotation data to get labels
            let annotationLabels: string[] = [];
            if (photo.annotationData) {
              try {
                const data = JSON.parse(photo.annotationData);
                if (data.paths && Array.isArray(data.paths)) {
                  annotationLabels = data.paths
                    .map((p: any) => p.label)
                    .filter((label: string) => label);
                }
              } catch (e) {
                console.error("Error parsing annotation data:", e);
              }
            }

            return {
              data: `data:image/jpeg;base64,${base64}`,
              hasAnnotation: !!photo.annotationData,
              annotationLabels: annotationLabels,
              notes: photo.conditionNotes,
            };
          } catch (error) {
            console.warn("Photo unavailable (may have been taken before storage fix):", photo.id);
            totalPhotosMissing++;
            return null;
          }
        })
      );
      return { ...item, photosBase64: photosBase64.filter(p => p !== null) };
    })
  );

  const hasMissingFiles = signatureMissing || totalPhotosMissing > 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 5px 0;
      opacity: 0.95;
    }
    .section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .summary-item {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
    }
    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .summary-value {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    .item-card {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
    }
    .item-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
    .item-artist {
      font-size: 14px;
      color: #6b7280;
      margin: 5px 0;
    }
    .item-id {
      font-size: 12px;
      color: #9ca3af;
      font-family: monospace;
    }
    .condition-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .condition-excellent { background: #d1fae5; color: #065f46; }
    .condition-good { background: #dbeafe; color: #1e40af; }
    .condition-fair { background: #fef3c7; color: #92400e; }
    .condition-poor { background: #fee2e2; color: #991b1b; }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
      margin: 15px 0;
    }
    .photo-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 1;
      background: #e5e7eb;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .annotation-badge {
      position: absolute;
      top: 5px;
      left: 5px;
      background: rgba(251, 146, 60, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .photo-count {
      position: absolute;
      bottom: 5px;
      right: 5px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .item-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    .detail-item {
      font-size: 14px;
    }
    .detail-label {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 3px;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 500;
    }
    .notes {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      border-radius: 4px;
      margin-top: 15px;
      font-size: 14px;
      color: #78350f;
    }
    .signature-box {
      background: #f0fdf4;
      border: 2px solid #86efac;
      border-radius: 10px;
      padding: 20px;
      margin-top: 20px;
    }
    .signature-title {
      font-size: 16px;
      font-weight: 600;
      color: #166534;
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 12px;
      margin-top: 30px;
    }
    @media print {
      body { background: white; }
      .section { box-shadow: none; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎨 Collection Report</h1>
    <p><strong>${collection.customerName}</strong></p>
    <p>Collection ID: ${collection.id}</p>
    <p>${new Date(collection.collectionDate).toLocaleDateString()} • ${collection.employeeName}</p>
  </div>

  <div class="section">
    <h2 class="section-title">📊 Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Items Collected</div>
        <div class="summary-value">${collection.items.length}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Photos</div>
        <div class="summary-value">${totalPhotos}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Value</div>
        <div class="summary-value">$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Status</div>
        <div class="summary-value">${collection.status === "signed" ? "✅ Signed" : collection.status === "completed" ? "📦 Completed" : "⏳ In Progress"}</div>
      </div>
    </div>

    <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
      <div style="margin-bottom: 10px;"><strong>📍 Pickup:</strong> ${collection.pickupAddress}</div>
      ${collection.deliveryAddress ? `<div><strong>📦 Delivery:</strong> ${collection.deliveryAddress}</div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">📦 Items Collected (${collection.items.length})</h2>
    ${itemsWithBase64Photos.map((item, index) => `
      <div class="item-card">
        <div class="item-header">
          <div>
            <h3 class="item-title">${index + 1}. ${item.title}</h3>
            ${item.artistName ? `<p class="item-artist">by ${item.artistName}</p>` : ''}
            <div class="item-id">${item.id}</div>
          </div>
          <span class="condition-badge condition-${item.overallCondition.toLowerCase()}">${item.overallCondition}</span>
        </div>

        ${item.photosBase64.length > 0 ? `
          <div class="photo-grid">
            ${item.photosBase64.map((photoObj, photoIndex) => `
              <div class="photo-item">
                <img src="${photoObj.data}" alt="Photo ${photoIndex + 1}">
                ${photoObj.hasAnnotation ? `
                  <div class="annotation-badge">✏️ ${photoObj.annotationLabels && photoObj.annotationLabels.length > 0 ? photoObj.annotationLabels.join(", ") : "Annotated"}</div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: #9ca3af; font-style: italic;">No photos</p>'}

        <div class="item-details">
          <div class="detail-item">
            <div class="detail-label">Dimensions</div>
            <div class="detail-value">${item.dimensions.length} × ${item.dimensions.width} × ${item.dimensions.height} ${item.dimensions.unit}</div>
          </div>
          ${item.dimensions.weight ? `
            <div class="detail-item">
              <div class="detail-label">Weight</div>
              <div class="detail-value">${item.dimensions.weight} ${item.dimensions.weightUnit}</div>
            </div>
          ` : ''}
          <div class="detail-item">
            <div class="detail-label">Value</div>
            <div class="detail-value">${item.currency} ${item.estimatedValue.toLocaleString()}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Photos</div>
            <div class="detail-value">${item.photos.length} captured</div>
          </div>
        </div>

        ${item.description ? `<div class="notes"><strong>Description:</strong> ${item.description}</div>` : ''}
        ${item.conditionNotes ? `<div class="notes"><strong>Condition Notes:</strong> ${item.conditionNotes}</div>` : ''}

        ${item.photos.some(p => p.conditionNotes) ? `
          <div class="notes">
            <strong>Photo Notes:</strong>
            <ul style="margin: 5px 0 0 0; padding-left: 20px;">
              ${item.photos.map((photo, photoIndex) =>
                photo.conditionNotes ? `<li>Photo ${photoIndex + 1}: ${photo.conditionNotes}</li>` : ''
              ).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  ${collection.signature ? `
    <div class="section">
      <div class="signature-box">
        <div class="signature-title">✅ Signed & Approved</div>
        ${signatureBase64 ? `
          <div style="margin: 15px 0; padding: 10px; background: white; border: 1px solid #d1d5db; border-radius: 6px;">
            <img src="data:image/png;base64,${signatureBase64}" alt="Signature" style="max-width: 300px; height: auto; display: block;">
          </div>
        ` : ''}
        <p><strong>Name:</strong> ${collection.signature.signerName}</p>
        <p><strong>Role:</strong> ${collection.signature.signerRole}</p>
        <p><strong>Date:</strong> ${new Date(collection.signature.timestamp).toLocaleString()}</p>
      </div>
    </div>
  ` : ''}

  ${collection.notes ? `
    <div class="section">
      <h2 class="section-title">📝 Additional Notes</h2>
      <p>${collection.notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;

  return { html, hasMissingFiles };
};

export const emailCollectionReport = async (collection: Collection): Promise<void> => {
  try {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Email Not Available", "Email is not available on this device.");
      return;
    }

    const { html: reportHTML, hasMissingFiles } = await generateCollectionHTML(collection);

    // Show warning if some files are missing
    if (hasMissingFiles) {
      Alert.alert(
        "Some Files Unavailable",
        "Some photos or signature images could not be included in the report (they may have been captured before a recent app update). The report will be sent with the available content.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Anyway",
            onPress: async () => {
              await MailComposer.composeAsync({
                subject: `Collection Report - ${collection.customerName} (${collection.id})`,
                body: reportHTML,
                isHtml: true,
              });
            },
          },
        ]
      );
    } else {
      await MailComposer.composeAsync({
        subject: `Collection Report - ${collection.customerName} (${collection.id})`,
        body: reportHTML,
        isHtml: true,
      });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    Alert.alert("Error", "Failed to open email composer.");
  }
};

export const shareCollectionReport = async (collection: Collection): Promise<void> => {
  try {
    const { html: reportHTML } = await generateCollectionHTML(collection);
    const fileName = `collection-${collection.id}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, reportHTML, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/html",
        dialogTitle: `Collection Report - ${collection.customerName}`,
      });
    } else {
      Alert.alert("Sharing Not Available", "Sharing is not available on this device.");
    }
  } catch (error) {
    console.error("Error sharing report:", error);
    Alert.alert("Error", "Failed to generate and share report.");
  }
};
