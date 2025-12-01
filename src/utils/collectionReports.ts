import * as MailComposer from "expo-mail-composer";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import type { Collection } from "../types/collection";

export const generateCollectionText = (collection: Collection): string => {
  const totalValue = collection.items.reduce((sum, item) => {
    const valueInUSD = item.currency === "USD" ? item.estimatedValue :
                       item.currency === "EUR" ? item.estimatedValue * 1.1 :
                       item.estimatedValue * 1.25;
    return sum + valueInUSD;
  }, 0);

  const totalPhotos = collection.items.reduce((sum, item) => sum + item.photos.length, 0);

  let report = `
═══════════════════════════════════════════════════
  ART LOGISTICS & CONDITION REPORT
═══════════════════════════════════════════════════

COLLECTION SUMMARY
--------------------------------------------------
Collection ID:    ${collection.id}
Date:            ${new Date(collection.collectionDate).toLocaleDateString()}
Customer:        ${collection.customerName}
Collector:       ${collection.employeeName}
Status:          ${collection.status === "signed" ? "Signed & Completed" : collection.status === "completed" ? "Completed" : "In Progress"}

Total Items:     ${collection.items.length}
Total Photos:    ${totalPhotos}
Total Value:     USD $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

ADDRESSES
--------------------------------------------------
Pickup:          ${collection.pickupAddress}
${collection.deliveryAddress ? `Delivery:        ${collection.deliveryAddress}` : ''}

`;

  report += `
═══════════════════════════════════════════════════
  ITEMS COLLECTED (${collection.items.length})
═══════════════════════════════════════════════════

`;

  collection.items.forEach((item, index) => {
    report += `
[${index + 1}] ${item.title}${item.artistName ? ` by ${item.artistName}` : ''}
--------------------------------------------------
Item ID:         ${item.id}
Dimensions:      ${item.dimensions.length} × ${item.dimensions.width} × ${item.dimensions.height} ${item.dimensions.unit}
${item.dimensions.weight ? `Weight:          ${item.dimensions.weight} ${item.dimensions.weightUnit}\n` : ''}Value:           ${item.currency} ${item.estimatedValue.toLocaleString()}
Condition:       ${item.overallCondition}
Photos:          ${item.photos.length} captured

${item.description ? `Description:\n${item.description}\n\n` : ''}${item.conditionNotes ? `Condition Notes:\n${item.conditionNotes}\n\n` : ''}`;

    const photoNotes = item.photos.filter(p => p.conditionNotes);
    if (photoNotes.length > 0) {
      report += 'Photo-Specific Notes:\n';
      item.photos.forEach((photo, photoIndex) => {
        if (photo.conditionNotes) {
          report += `  Photo ${photoIndex + 1}: ${photo.conditionNotes}\n`;
        }
      });
      report += '\n';
    }
  });

  if (collection.signature) {
    report += `
═══════════════════════════════════════════════════
  SIGNATURE & APPROVAL
═══════════════════════════════════════════════════

Signed by:       ${collection.signature.signerName}
Role:            ${collection.signature.signerRole}
Date & Time:     ${new Date(collection.signature.timestamp).toLocaleString()}

`;
  }

  if (collection.notes) {
    report += `
═══════════════════════════════════════════════════
  ADDITIONAL NOTES
═══════════════════════════════════════════════════

${collection.notes}

`;
  }

  report += `
═══════════════════════════════════════════════════
Generated: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════
`;

  return report;
};

export const emailCollectionReport = async (collection: Collection): Promise<void> => {
  try {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Email Not Available", "Email is not available on this device.");
      return;
    }

    const reportText = generateCollectionText(collection);

    await MailComposer.composeAsync({
      subject: `Collection Report - ${collection.customerName} (${collection.id})`,
      body: reportText,
      isHtml: false,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    Alert.alert("Error", "Failed to open email composer.");
  }
};

export const shareCollectionReport = async (collection: Collection): Promise<void> => {
  try {
    const reportText = generateCollectionText(collection);
    const fileName = `collection-${collection.id}.txt`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, reportText, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
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
