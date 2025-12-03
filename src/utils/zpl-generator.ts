// ZPL (Zebra Programming Language) generator for location labels
// Generates labels with large QR codes for 4x4" or 4x6" labels

export interface LocationLabelData {
  locationCode: string;
  locationName: string;
  fullPath: string;
  warehouseName?: string;
}

export type LabelSize = "4x4" | "4x6";

/**
 * Generate ZPL code for a single location label
 * @param data Location data to print
 * @param size Label size (4x4 or 4x6 inches)
 * @returns ZPL code string ready to send to printer
 */
export function generateLocationLabel(
  data: LocationLabelData,
  size: LabelSize = "4x4"
): string {
  const { locationCode, locationName, fullPath, warehouseName } = data;

  // Convert inches to dots (203 DPI for most Zebra printers)
  const DPI = 203;
  const labelWidth = 4 * DPI; // 812 dots
  const labelHeight = size === "4x4" ? 4 * DPI : 6 * DPI; // 812 or 1218 dots

  // QR code size - make it large for easy scanning
  const qrSize = size === "4x4" ? 10 : 12; // Magnification factor (10 = ~2.5", 12 = ~3")

  // Calculate positions (centered)
  const qrX = 100; // Left margin
  const qrY = 80; // Top margin

  // Text positions
  const textX = qrX + (qrSize * 33) + 50; // Right of QR code
  const titleY = qrY + 20;
  const codeY = titleY + 60;
  const pathY = codeY + 50;
  const warehouseY = size === "4x6" ? pathY + 100 : pathY + 80;

  // Build ZPL code
  let zpl = "";

  // Start label
  zpl += "^XA\n"; // Start format

  // Set label home position
  zpl += "^LH0,0\n";

  // Print QR Code (large for easy scanning)
  zpl += `^FO${qrX},${qrY}\n`; // Field origin
  zpl += "^BQN,2," + qrSize + "\n"; // QR code, normal orientation, error correction level H, magnification
  zpl += `^FDQA,${locationCode}^FS\n`; // QR code data

  // Print Location Name (bold, large)
  zpl += `^FO${textX},${titleY}\n`;
  zpl += "^A0N,50,50\n"; // Font 0, normal, height 50, width 50
  zpl += `^FD${truncateText(locationName, 20)}^FS\n`;

  // Print Location Code (extra large, bold)
  zpl += `^FO${textX},${codeY}\n`;
  zpl += "^A0N,70,70\n"; // Font 0, normal, height 70, width 70
  zpl += `^FD${locationCode}^FS\n`;

  // Print Full Path (smaller)
  zpl += `^FO${textX},${pathY}\n`;
  zpl += "^A0N,30,30\n"; // Font 0, normal, height 30, width 30
  zpl += `^FD${truncateText(fullPath, 25)}^FS\n`;

  // Print Warehouse (if provided)
  if (warehouseName) {
    zpl += `^FO${textX},${warehouseY}\n`;
    zpl += "^A0N,28,28\n";
    zpl += `^FDWarehouse: ${truncateText(warehouseName, 20)}^FS\n`;
  }

  // Add border for 4x6 labels
  if (size === "4x6") {
    zpl += "^FO50,50^GB712,1118,4^FS\n"; // Border box
  }

  // Print barcode at bottom (Code 128)
  const barcodeY = size === "4x4" ? labelHeight - 150 : labelHeight - 180;
  zpl += `^FO${qrX},${barcodeY}\n`;
  zpl += "^BY3,3,80\n"; // Bar width, ratio, height
  zpl += `^BCN,80,Y,N,N\n`; // Code 128, height 80, print interpretation line
  zpl += `^FD${locationCode}^FS\n`;

  // End label
  zpl += "^XZ\n"; // End format

  return zpl;
}

/**
 * Generate ZPL code for multiple location labels in batch
 * @param locations Array of location data
 * @param size Label size
 * @returns ZPL code for all labels
 */
export function generateLocationLabelBatch(
  locations: LocationLabelData[],
  size: LabelSize = "4x4"
): string {
  return locations.map((loc) => generateLocationLabel(loc, size)).join("\n");
}

/**
 * Generate ZPL code for location and all its children
 * @param location Parent location data
 * @param children Array of child location data
 * @param size Label size
 * @returns ZPL code for parent and all children
 */
export function generateLocationLabelWithChildren(
  location: LocationLabelData,
  children: LocationLabelData[],
  size: LabelSize = "4x4"
): string {
  const allLocations = [location, ...children];
  return generateLocationLabelBatch(allLocations, size);
}

/**
 * Truncate text to fit label width
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Send ZPL to printer via Bluetooth or network
 * This is a helper that can be used with printer libraries
 * @param zpl ZPL code to send
 * @param printerAddress Bluetooth MAC or IP address
 */
export async function sendZPLToPrinter(
  zpl: string,
  printerAddress: string
): Promise<void> {
  // This would be implemented with a printer library
  // For now, just log the ZPL
  console.log("Sending ZPL to printer:", printerAddress);
  console.log(zpl);

  // In a real implementation, you would:
  // 1. Connect to printer via Bluetooth or Network
  // 2. Send ZPL string as raw bytes
  // 3. Close connection
  // Example with a hypothetical printer library:
  // await printer.connect(printerAddress);
  // await printer.write(zpl);
  // await printer.disconnect();

  throw new Error(
    "Printer integration not yet implemented. Configure printer in Settings."
  );
}

/**
 * Preview ZPL label (for development/debugging)
 * Returns a URL to Labelary API that renders the ZPL as PNG
 */
export function getZPLPreviewURL(zpl: string, size: LabelSize): string {
  const dpi = 203;
  const width = 4;
  const height = size === "4x4" ? 4 : 6;

  // Labelary is a free online ZPL viewer
  const encodedZPL = encodeURIComponent(zpl);
  return `http://api.labelary.com/v1/printers/${dpi}dpi/labels/${width}x${height}/0/${encodedZPL}`;
}

/**
 * Download ZPL as text file
 * Useful for users who want to manually send to printer
 */
export function downloadZPL(zpl: string, filename: string = "labels.zpl"): void {
  // On mobile, we'd share the file instead of downloading
  // This would be implemented with expo-sharing or similar
  console.log("ZPL file ready for download:", filename);
  console.log(zpl);
}
