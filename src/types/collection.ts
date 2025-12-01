export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  locations?: CustomerLocation[];
}

export interface CustomerLocation {
  id: string;
  name: string;
  address: string;
  type: "pickup" | "delivery" | "both";
  isDefault?: boolean;
  createdAt: number;
}

export interface ItemDimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "in";
  weight?: number;
  weightUnit?: "kg" | "lb";
}

export interface ItemPhoto {
  id: string;
  uri: string;
  timestamp: number;
  conditionNotes?: string;
  aiDetectedDamage?: string;
  aiAnalyzed?: boolean;
  annotatedUri?: string; // Annotated version of the photo
}

export interface CollectionItem {
  id: string;
  displayId: string; // Short ID for QR codes (e.g., "A1234-01")
  collectionId: string;
  title: string;
  description: string;
  artistName?: string;
  dimensions: ItemDimensions;
  estimatedValue: number;
  currency: "USD" | "EUR" | "GBP";
  photos: ItemPhoto[];
  overallCondition: "Excellent" | "Good" | "Fair" | "Poor" | "Damaged";
  conditionNotes: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionSignature {
  signatureUri: string;
  signerName: string;
  signerRole: string;
  timestamp: number;
}

export interface Collection {
  id: string;
  displayId: string; // Short ID for QR codes (e.g., "A1234")
  customerId: string;
  customerName: string;
  collectionDate: number;
  status: "in_progress" | "completed" | "signed";
  pickupAddress: string;
  deliveryAddress?: string;
  items: CollectionItem[];
  signature?: CollectionSignature;
  employeeName: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
