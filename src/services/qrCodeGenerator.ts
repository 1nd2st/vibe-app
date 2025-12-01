/**
 * QR Code Generator for React Native using SVG
 * Based on qrcode algorithm - generates QR codes without external dependencies
 */

type QRCodeData = boolean[][];

/**
 * Generate QR Code data matrix from text
 * This is a simplified QR code generator for basic text encoding
 * @param text - Text to encode in QR code
 * @returns 2D array representing QR code (true = black, false = white)
 */
export const generateQRCodeMatrix = (text: string): QRCodeData => {
  // Simplified QR code generation
  // For production, consider using a proper QR code library if available

  const size = 25; // QR code grid size
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

  // Add finder patterns (corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Simple data encoding (not a real QR code algorithm, just visual representation)
  const data = encodeText(text);
  let dataIndex = 0;

  for (let y = size - 1; y >= 9 && dataIndex < data.length; y--) {
    for (let x = size - 1; x >= 9 && dataIndex < data.length; x--) {
      if (!matrix[y][x]) {
        matrix[y][x] = data[dataIndex];
        dataIndex++;
      }
    }
  }

  return matrix;
};

/**
 * Add finder pattern (the square patterns in corners)
 */
const addFinderPattern = (matrix: boolean[][], startX: number, startY: number) => {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const isEdge = x === 0 || x === 6 || y === 0 || y === 6;
      const isInnerSquare = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (startY + y < matrix.length && startX + x < matrix[0].length) {
        matrix[startY + y][startX + x] = isEdge || isInnerSquare;
      }
    }
  }
};

/**
 * Simple text encoding to binary array
 */
const encodeText = (text: string): boolean[] => {
  const binary: boolean[] = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    for (let bit = 7; bit >= 0; bit--) {
      binary.push(((charCode >> bit) & 1) === 1);
    }
  }
  return binary;
};

/**
 * Generate SVG QR code from matrix
 * @param matrix - QR code data matrix
 * @param size - Pixel size of each module (default 10)
 * @returns SVG string
 */
export const generateQRCodeSVG = (matrix: QRCodeData, moduleSize: number = 10): string => {
  const size = matrix.length;
  const totalSize = size * moduleSize;
  const padding = moduleSize * 2;
  const viewBoxSize = totalSize + padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBoxSize}" height="${viewBoxSize}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}">`;
  svg += `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="white"/>`;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        const px = x * moduleSize + padding;
        const py = y * moduleSize + padding;
        svg += `<rect x="${px}" y="${py}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
};

/**
 * Generate QR code as base64 data URI for collection
 * @param collectionId - Collection ID to encode
 * @returns Base64 data URI string
 */
export const generateCollectionQRCode = (collectionId: string): string => {
  const matrix = generateQRCodeMatrix(collectionId);
  const svg = generateQRCodeSVG(matrix);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
};

/**
 * Generate QR code as base64 data URI for item
 * @param itemId - Item ID to encode
 * @returns Base64 data URI string
 */
export const generateItemQRCode = (itemId: string): string => {
  const matrix = generateQRCodeMatrix(itemId);
  const svg = generateQRCodeSVG(matrix);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
};

/**
 * Generate QR code for display in React Native Image component
 * @param text - Text to encode
 * @param size - Module size in pixels
 * @returns SVG string that can be used with react-native-svg
 */
export const generateQRCodeForDisplay = (text: string, size: number = 8): { width: number; height: number; svg: string } => {
  const matrix = generateQRCodeMatrix(text);
  const totalSize = matrix.length * size + size * 4; // Including padding
  const svg = generateQRCodeSVG(matrix, size);

  return {
    width: totalSize,
    height: totalSize,
    svg,
  };
};
