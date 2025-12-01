export interface AppSettings {
  // AI Damage Detection
  aiEnabled: boolean;
  aiAutoDetect: boolean;
  aiPrompt: string;
  aiModel: "gpt-4o" | "claude-3-5-sonnet";

  // Zebra Printer
  printerEnabled: boolean;
  printerIp?: string;
  printerPort: number;
  labelWidth: number;  // in inches
  labelHeight: number; // in inches
  printerDpi: 203 | 300 | 600;

  // General
  companyName: string;
  companyLogo?: string;
}

export const defaultSettings: AppSettings = {
  aiEnabled: false,
  aiAutoDetect: false,
  aiPrompt: "Analyze this artwork/item photo and identify any visible damage, wear, scratches, cracks, discoloration, or condition issues. Be specific about location and severity.",
  aiModel: "gpt-4o",

  printerEnabled: false,
  printerPort: 9100,
  labelWidth: 3,
  labelHeight: 1,
  printerDpi: 203,

  companyName: "Art Logistics",
};
