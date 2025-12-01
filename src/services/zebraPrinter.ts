import { useSettingsStore } from "../state/settingsStore";

/**
 * Generate ZPL (Zebra Programming Language) code for printing item labels
 * Labels include QR code, human-readable ID, and item description
 * @param itemId - Item ID to encode
 * @param itemTitle - Short item title/description
 * @returns ZPL code string ready to send to Zebra printer
 */
export const generateItemLabelZPL = (itemId: string, itemTitle: string): string => {
  const settings = useSettingsStore.getState().settings;

  const labelWidth = Math.round(settings.labelWidth * settings.printerDpi);
  const labelHeight = Math.round(settings.labelHeight * settings.printerDpi);

  // Calculate positions based on label size
  const qrSize = Math.min(labelHeight - 40, 150); // QR code size
  const qrX = 20;
  const qrY = 20;

  const textX = qrX + qrSize + 20; // Text starts after QR code
  const textY = qrY + 10;

  // Truncate title if too long
  const maxTitleLength = 25;
  const truncatedTitle = itemTitle.length > maxTitleLength
    ? itemTitle.substring(0, maxTitleLength - 3) + "..."
    : itemTitle;

  // Generate ZPL code
  let zpl = "^XA\n"; // Start format

  // Set label home position and print width
  zpl += `^LH0,0\n`;
  zpl += `^PW${labelWidth}\n`;

  // QR Code (Model 2, Error Correction High, Magnification factor based on size)
  const qrMagnification = Math.max(3, Math.floor(qrSize / 50));
  zpl += `^FO${qrX},${qrY}\n`;
  zpl += `^BQN,2,${qrMagnification}\n`;
  zpl += `^FDHA,${itemId}^FS\n`;

  // Item ID - Bold, larger font
  zpl += `^FO${textX},${textY}\n`;
  zpl += `^A0N,30,30\n`; // Font 0, Normal orientation, 30x30
  zpl += `^FD${itemId}^FS\n`;

  // Item Title - Regular font
  zpl += `^FO${textX},${textY + 40}\n`;
  zpl += `^A0N,20,20\n`; // Font 0, Normal orientation, 20x20
  zpl += `^FD${truncatedTitle}^FS\n`;

  // Company name at bottom (if configured)
  if (settings.companyName) {
    zpl += `^FO${textX},${labelHeight - 30}\n`;
    zpl += `^A0N,18,18\n`;
    zpl += `^FD${settings.companyName}^FS\n`;
  }

  zpl += "^XZ\n"; // End format

  return zpl;
};

/**
 * Generate ZPL code for printing collection label
 * @param collectionId - Collection ID to encode
 * @param customerName - Customer name
 * @param itemCount - Number of items in collection
 * @returns ZPL code string
 */
export const generateCollectionLabelZPL = (
  collectionId: string,
  customerName: string,
  itemCount: number
): string => {
  const settings = useSettingsStore.getState().settings;

  const labelWidth = Math.round(settings.labelWidth * settings.printerDpi);
  const labelHeight = Math.round(settings.labelHeight * settings.printerDpi);

  const qrSize = Math.min(labelHeight - 40, 150);
  const qrX = 20;
  const qrY = 20;

  const textX = qrX + qrSize + 20;
  const textY = qrY + 10;

  const maxCustomerLength = 20;
  const truncatedCustomer = customerName.length > maxCustomerLength
    ? customerName.substring(0, maxCustomerLength - 3) + "..."
    : customerName;

  let zpl = "^XA\n";
  zpl += `^LH0,0\n`;
  zpl += `^PW${labelWidth}\n`;

  // QR Code
  const qrMagnification = Math.max(3, Math.floor(qrSize / 50));
  zpl += `^FO${qrX},${qrY}\n`;
  zpl += `^BQN,2,${qrMagnification}\n`;
  zpl += `^FDHA,${collectionId}^FS\n`;

  // Collection ID
  zpl += `^FO${textX},${textY}\n`;
  zpl += `^A0N,28,28\n`;
  zpl += `^FDCOLLECTION^FS\n`;

  zpl += `^FO${textX},${textY + 35}\n`;
  zpl += `^A0N,25,25\n`;
  zpl += `^FD${collectionId}^FS\n`;

  // Customer name
  zpl += `^FO${textX},${textY + 70}\n`;
  zpl += `^A0N,20,20\n`;
  zpl += `^FD${truncatedCustomer}^FS\n`;

  // Item count
  zpl += `^FO${textX},${textY + 95}\n`;
  zpl += `^A0N,18,18\n`;
  zpl += `^FD${itemCount} item${itemCount !== 1 ? "s" : ""}^FS\n`;

  if (settings.companyName) {
    zpl += `^FO${textX},${labelHeight - 30}\n`;
    zpl += `^A0N,18,18\n`;
    zpl += `^FD${settings.companyName}^FS\n`;
  }

  zpl += "^XZ\n";

  return zpl;
};

/**
 * Send ZPL code to Zebra printer via network
 * @param zplCode - ZPL code string to print
 * @returns Promise that resolves when print job is sent
 */
export const printToZebraPrinter = async (zplCode: string): Promise<void> => {
  const settings = useSettingsStore.getState().settings;

  if (!settings.printerEnabled) {
    throw new Error("Printer is not enabled in settings");
  }

  if (!settings.printerIp) {
    throw new Error("Printer IP address not configured");
  }

  try {
    const url = `http://${settings.printerIp}:${settings.printerPort}/pstprnt`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: zplCode,
    });

    if (!response.ok) {
      throw new Error(`Printer responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to send print job to Zebra printer:", error);
    throw error;
  }
};

/**
 * Print item label to configured Zebra printer
 * @param itemId - Item ID
 * @param itemTitle - Item title/description
 */
export const printItemLabel = async (itemId: string, itemTitle: string): Promise<void> => {
  const zpl = generateItemLabelZPL(itemId, itemTitle);
  await printToZebraPrinter(zpl);
};

/**
 * Print collection label to configured Zebra printer
 * @param collectionId - Collection ID
 * @param customerName - Customer name
 * @param itemCount - Number of items
 */
export const printCollectionLabel = async (
  collectionId: string,
  customerName: string,
  itemCount: number
): Promise<void> => {
  const zpl = generateCollectionLabelZPL(collectionId, customerName, itemCount);
  await printToZebraPrinter(zpl);
};
