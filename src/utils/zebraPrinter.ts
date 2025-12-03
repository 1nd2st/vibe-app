import { Alert } from "react-native";
import type { CollectionItem } from "../types/collection";

/**
 * Send ZPL code directly to Zebra printer via network
 *
 * NOTE: This attempts HTTP POST which works if the printer has a web interface.
 * For raw port 9100 printing, you may need to:
 * 1. Use a network bridge/proxy server
 * 2. Configure printer's web interface (port 80 or 443)
 * 3. Use printer's cloud print service if available
 */
export const printZPLToNetwork = async (
  zplCode: string,
  printerIp: string,
  printerPort: number = 9100
): Promise<boolean> => {
  try {
    // Create abort controller with 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Try HTTP POST to printer
      const response = await fetch(`http://${printerIp}:${printerPort}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: zplCode,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for successful response
      if (response.ok || response.status === 204) {
        return true;
      }

      // Handle specific error codes
      if (response.status === 401) {
        Alert.alert(
          "Printer Authentication Required",
          `The printer at ${printerIp}:${printerPort} requires authentication.\n\nPlease check:\n• Printer web interface settings\n• Try port 80 instead of ${printerPort}\n• Printer may require login credentials`
        );
        return false;
      }

      if (response.status === 404) {
        Alert.alert(
          "Printer Not Found",
          `No printer web interface found at ${printerIp}:${printerPort}.\n\nFor raw ZPL printing:\n• Try port 80 for web interface\n• Port 9100 requires raw TCP (not HTTP)\n• Check printer supports network printing`
        );
        return false;
      }

      throw new Error(`Printer responded with status: ${response.status}`);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (fetchError.name === 'AbortError') {
        Alert.alert(
          "Connection Timeout",
          `Could not reach printer at ${printerIp}:${printerPort} (timed out after 10 seconds).\n\nPlease check:\n• Printer IP address is correct\n• Printer is powered on\n• Device is on same network as printer\n• Printer port is correct (try 80 or 9100)`
        );
        return false;
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error("Failed to print to network printer:", error);

    // Only show generic alert if we haven't already shown a specific one
    if (!error.message?.includes("Printer") && error.name !== 'AbortError') {
      Alert.alert(
        "Print Failed",
        `Could not connect to printer at ${printerIp}:${printerPort}.\n\nTroubleshooting:\n• Verify printer IP address\n• Try port 80 (web interface)\n• Check device is on same network\n• Printer must be powered on\n\nError: ${error.message || "Network error"}`
      );
    }
    return false;
  }
};

/**
 * Generate ZPL barcode label for an item
 * Optimized for 3x1 inch label at 203 DPI (609x203 dots)
 */
export const generateItemZPL = (
  item: CollectionItem,
  collectionId: string,
  labelWidth: number = 3,
  labelHeight: number = 1,
  dpi: number = 203
): string => {
  const widthDots = labelWidth * dpi;
  const heightDots = labelHeight * dpi;

  // Calculate positions based on label size
  const margin = Math.round(dpi * 0.1); // 0.1 inch margin
  const contentWidth = widthDots - 2 * margin;

  const zpl = `
^XA
^CF0,30
^FO${margin},${margin}^FD${item.title.substring(0, 25)}^FS
^CF0,20
^FO${margin},${margin + 40}^FDItem: ${item.displayId || item.id}^FS
^FO${margin},${margin + 65}^FDColl: ${collectionId.substring(0, 12)}^FS
^FO${margin},${margin + 90}^FDCond: ${item.overallCondition}^FS
^CF0,18
^FO${margin},${margin + 115}^FD${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height} ${item.dimensions.unit}^FS
^FO${margin},${margin + 138}^FD${item.currency} ${item.estimatedValue.toLocaleString()}^FS
^XZ
  `.trim();

  return zpl;
};

/**
 * Generate test label with frame (5 DPI smaller than label size)
 */
export const generateTestLabelZPL = (
  labelWidth: number = 3,
  labelHeight: number = 1,
  dpi: number = 203
): string => {
  const widthDots = labelWidth * dpi;
  const heightDots = labelHeight * dpi;
  const frameMargin = 5; // 5 dots smaller

  const zpl = `
^XA
^FO${frameMargin},${frameMargin}^GB${widthDots - 2 * frameMargin},${heightDots - 2 * frameMargin},3^FS

^CF0,40
^FO${Math.round(widthDots / 2 - 100)},${Math.round(heightDots / 2 - 60)}^FDTEST LABEL^FS

^CF0,25
^FO${Math.round(widthDots / 2 - 80)},${Math.round(heightDots / 2 - 10)}^FD${labelWidth}" x ${labelHeight}"^FS
^FO${Math.round(widthDots / 2 - 60)},${Math.round(heightDots / 2 + 20)}^FD${dpi} DPI^FS

^CF0,20
^FO${Math.round(widthDots / 2 - 90)},${Math.round(heightDots / 2 + 50)}^FD${widthDots} x ${heightDots} dots^FS

^CF0,18
^FO${frameMargin + 10},${heightDots - 30}^FDFrame: ${widthDots - 2 * frameMargin}x${heightDots - 2 * frameMargin}^FS

^XZ
  `.trim();

  return zpl;
};

/**
 * Print single item label to network printer
 */
export const printItemLabel = async (
  item: CollectionItem,
  collectionId: string,
  printerIp: string,
  printerPort: number = 9100,
  labelWidth: number = 3,
  labelHeight: number = 1,
  dpi: number = 203
): Promise<boolean> => {
  const zpl = generateItemZPL(item, collectionId, labelWidth, labelHeight, dpi);
  return await printZPLToNetwork(zpl, printerIp, printerPort);
};

/**
 * Print multiple item labels in batch
 */
export const printMultipleItemLabels = async (
  items: CollectionItem[],
  collectionId: string,
  printerIp: string,
  printerPort: number = 9100,
  labelWidth: number = 3,
  labelHeight: number = 1,
  dpi: number = 203
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const item of items) {
    const result = await printItemLabel(
      item,
      collectionId,
      printerIp,
      printerPort,
      labelWidth,
      labelHeight,
      dpi
    );

    if (result) {
      success++;
    } else {
      failed++;
      // Stop on first failure to avoid spamming errors
      break;
    }

    // Small delay between prints
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { success, failed };
};

/**
 * Print test label to verify printer configuration
 */
export const printTestLabel = async (
  printerIp: string,
  printerPort: number = 9100,
  labelWidth: number = 3,
  labelHeight: number = 1,
  dpi: number = 203
): Promise<boolean> => {
  const zpl = generateTestLabelZPL(labelWidth, labelHeight, dpi);
  return await printZPLToNetwork(zpl, printerIp, printerPort);
};
