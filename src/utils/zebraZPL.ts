import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import type { CollectionItem } from "../types/collection";

/**
 * Generate Zebra ZPL barcode label for an item
 * Zebra ZPL (Zebra Programming Language) is used to print labels on Zebra printers
 */
export const generateItemZPL = (item: CollectionItem, collectionId: string): string => {
  // Standard label size for 4x6 inch label at 203 DPI
  // Label dimensions: 812 dots wide x 1218 dots tall

  const zpl = `
^XA
^FO50,50^GB700,0,3^FS
^CF0,60
^FO50,80^FDItem Label^FS
^FO50,160^GB700,0,2^FS

^CF0,40
^FO50,200^FD${item.title}^FS

^CF0,30
${item.artistName ? `^FO50,260^FDby ${item.artistName}^FS` : ''}

^FO50,320^GB700,0,2^FS

^CF0,25
^FO50,360^FDCollection: ${collectionId}^FS
^FO50,400^FDItem ID: ${item.displayId || item.id}^FS
^FO50,440^FDCondition: ${item.overallCondition}^FS
^FO50,480^FDDimensions: ${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height} ${item.dimensions.unit}^FS
^FO50,520^FDValue: ${item.currency} ${item.estimatedValue.toLocaleString()}^FS

^FO50,580^GB700,0,3^FS

^CF0,20
^FO50,620^FDQR Code:^FS
^FO50,660^BQN,2,8
^FDQA,${item.displayId || item.id}^FS

^CF0,18
^FO400,880^FDScan to view details^FS

^FO50,950^GB700,0,2^FS
^CF0,16
^FO50,980^FDPowered by Vibecode^FS

^XZ
  `.trim();

  return zpl;
};

/**
 * Share ZPL code for printing
 * Users can save this to a file and send to their Zebra printer
 */
export const shareItemZPL = async (item: CollectionItem, collectionId: string): Promise<void> => {
  try {
    const zplCode = generateItemZPL(item, collectionId);
    const fileName = `label-${item.displayId || item.id}.zpl`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, zplCode, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: `ZPL Label - ${item.title}`,
      });
    } else {
      Alert.alert("Sharing Not Available", "Sharing is not available on this device.");
    }
  } catch (error) {
    console.error("Error sharing ZPL:", error);
    Alert.alert("Error", "Failed to generate and share label.");
  }
};

/**
 * Copy ZPL code to clipboard for quick access
 */
export const copyZPLToClipboard = (item: CollectionItem, collectionId: string): string => {
  return generateItemZPL(item, collectionId);
};
