# Art Logistics & Condition Reporting App

A professional mobile application for art moving and logistics companies to document item collections with comprehensive condition reporting and digital signatures.

## Overview

This app streamlines the collection process for art logistics companies by providing a complete digital workflow for:
- Creating and managing collections
- Documenting items with photos and detailed condition reports
- Capturing client signatures for collection approval
- Generating unique IDs for collections and items for integration with other systems

## Features

### 1. **Collections Management**
- View all collections with status indicators (In Progress, Completed, Signed)
- Search collections by customer name or collection ID
- Track multiple collections per customer
- Each collection has a unique ID (format: `COL-{timestamp}-{random}`)

### 2. **New Collection Creation**
- Customer information capture (name, address, phone, email)
- Collection details (pickup address, delivery address, collector name)
- Additional notes field
- All data validated before creation

### 3. **Item Documentation**
- **Basic Information**: Title, description, artist name
- **Dimensions**: Length, width, height (cm or in), optional weight (kg or lb)
- **Value**: Estimated value in USD, EUR, or GBP
- **Condition Rating**: Excellent, Good, Fair, Poor, or Damaged
- **Condition Notes**: Detailed text description
- Each item has a unique ID (format: `ITEM-{timestamp}-{random}`)

### 4. **Photo Capture & Condition Reporting**
- Built-in camera with flash and flip camera controls
- Take multiple photos per item
- Add condition notes specific to each photo
- Photo indicators show which photos have notes attached
- Real-time photo preview strip
- Individual photo deletion

### 5. **Item Detail View**
- View all item photos in a grid layout
- Complete item specifications display
- Overall condition report with color-coded badges
- Photo-specific condition notes organized by photo number
- Tap photos to add or edit condition notes

### 6. **Digital Signature Collection**
- Collection summary display before signing
- Signer information capture (full name and role/title)
- Touch-based signature pad using React Native Skia
- Signature capture as image
- Prevents signing without items added
- Enforces completion workflow before signing

### 7. **Collection Workflow**
1. **In Progress** → Add items and document conditions
2. **Mark as Completed** → Review all items
3. **Get Signature** → Client/manager approval
4. **Signed** → Collection locked and complete

## Technical Implementation

### State Management
- **Zustand** with AsyncStorage persistence
- Separate stores for collections, items, and customers
- Optimized selectors to prevent unnecessary re-renders

### Data Structure

```typescript
Collection {
  id: string                    // Unique collection ID
  customerId: string
  customerName: string
  collectionDate: number
  status: "in_progress" | "completed" | "signed"
  pickupAddress: string
  deliveryAddress?: string
  items: CollectionItem[]
  signature?: CollectionSignature
  employeeName: string
  notes?: string
  createdAt: number
  updatedAt: number
}

CollectionItem {
  id: string                    // Unique item ID
  collectionId: string
  title: string
  description: string
  artistName?: string
  dimensions: ItemDimensions
  estimatedValue: number
  currency: "USD" | "EUR" | "GBP"
  photos: ItemPhoto[]
  overallCondition: "Excellent" | "Good" | "Fair" | "Poor" | "Damaged"
  conditionNotes: string
  createdAt: number
  updatedAt: number
}

ItemPhoto {
  id: string
  uri: string
  timestamp: number
  conditionNotes?: string
  aiDetectedDamage?: string     // Reserved for future AI integration
  aiAnalyzed?: boolean          // Reserved for future AI integration
}
```

### Navigation Stack
- **Collections** - Main list view
- **NewCollection** - Modal for creating collections
- **CollectionDetail** - View collection with all items
- **AddItem** - Modal for item details entry
- **Camera** - Full-screen camera for photo capture
- **ItemDetail** - View item details and photos
- **SignCollection** - Modal for signature capture

### Technologies Used
- **Expo SDK 53** with React Native 0.76.7
- **React Navigation** (Native Stack)
- **Expo Camera** for photo capture
- **React Native Skia** for signature drawing
- **React Native Gesture Handler** for touch interactions
- **Zustand** for state management
- **NativeWind** (TailwindCSS) for styling
- **AsyncStorage** for data persistence
- **React Native View Shot** for signature capture

## Future Enhancements (Not Yet Implemented)

### AI Damage Detection
The data structure includes fields for AI analysis:
- `aiDetectedDamage`: AI-generated damage description
- `aiAnalyzed`: Flag indicating AI processing status

To implement:
1. Send photos to vision AI API (OpenAI GPT-4 Vision, Anthropic Claude, etc.)
2. Request analysis of visible damage or condition issues
3. Store AI notes separately from user notes
4. Allow users to edit or override AI descriptions
5. Make AI analysis optional per user preference

## ID System for External Integration

All collections and items have unique IDs that can be used for:
- Integration with warehouse management systems
- Linking to insurance documentation
- Tracking items across multiple systems
- Generating reports and invoices

**ID Format**:
- Collections: `COL-{timestamp}-{random9chars}`
- Items: `ITEM-{timestamp}-{random9chars}`
- Customers: `CUST-{timestamp}-{random9chars}`
- Photos: `PHOTO-{timestamp}-{random9chars}`

## Data Persistence

All data is stored locally using AsyncStorage and persists between app sessions. Collections, items, and customer data are automatically saved as changes are made.

## Usage Workflow

1. **Start Collection**: Tap "+" button → Enter customer and collection details
2. **Add Items**: In collection detail, tap "+" → Fill item details → Take photos
3. **Document Condition**: Add notes to each photo describing any damage or features
4. **Complete Items**: Repeat for all items in the collection
5. **Mark Complete**: Once all items documented, mark collection as completed
6. **Get Signature**: Have client/manager sign to confirm item conditions
7. **Signed Collection**: Collection is now locked and ready for processing

## Notes
- Collections cannot be signed without at least one item
- Signed collections cannot be modified
- All timestamps are in milliseconds since epoch
- Photos are stored as local file URIs
- Signature is captured as PNG image

---

Built with ❤️ for art logistics professionals
