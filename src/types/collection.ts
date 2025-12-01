export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
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
}

export interface CollectionItem {
  id: string;
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
