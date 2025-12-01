# Art Logistics & Condition Reporting App

A professional mobile application for art moving and logistics companies to document item collections with comprehensive condition reporting, digital signatures, and export capabilities - inspired by Articheck's professional standards.

## Overview

This app streamlines the collection process for art logistics companies by providing a complete digital workflow for:
- Creating and managing collections with progress tracking
- Documenting items with photos and detailed condition reports
- Capturing client signatures for collection approval
- Exporting and sharing professional collection reports
- Generating unique IDs for collections and items for integration with other systems

## Key Features

### 1. **Collections Management**
- View all collections with status indicators (In Progress, Completed, Signed)
- Search collections by customer name or collection ID
- Track multiple collections per customer
- Each collection has a unique ID (format: `COL-{timestamp}-{random}`)
- Visual progress bar showing collection completion status

### 2. **Progress Tracking**
- **25%**: Collection created
- **50%**: Items added with photos
- **75%**: Collection marked as completed
- **100%**: Signed and approved
- Color-coded progress indicator (gray → amber → blue → green)

### 3. **New Collection Creation**
- Customer information capture (name, address, phone, email)
- Collection details (pickup address, delivery address, collector name)
- Additional notes field
- All data validated before creation

### 4. **Item Documentation**
- **Basic Information**: Title, description, artist name
- **Dimensions**: Length, width, height (cm or in), optional weight (kg or lb)
- **Value**: Estimated value in USD, EUR, or GBP
- **Condition Rating**: Excellent, Good, Fair, Poor, or Damaged
- **Condition Notes**: Detailed text description
- Each item has a unique ID (format: `ITEM-{timestamp}-{random}`)

### 5. **Photo Capture & Condition Reporting**
- Built-in camera with flash and flip camera controls
- Take multiple photos per item
- Add condition notes specific to each photo
- Photo indicators show which photos have notes attached
- Real-time photo preview strip
- Individual photo deletion
- Camera properly unmounts when finished

### 6. **Item Detail View**
- View all item photos in a grid layout
- Complete item specifications display
- Overall condition report with color-coded badges
- Photo-specific condition notes organized by photo number
- Tap photos to add or edit condition notes

### 7. **Digital Signature Collection**
- Comprehensive collection summary before signing
- **Shows all collected items** with:
  - Item thumbnails (first 4 photos per item)
  - Dimensions and values
  - Condition ratings
  - Photo counts
- **Total collection value** calculated automatically
- **Total photo count** across all items
- Signer information capture (full name and role/title)
- Touch-based signature pad using React Native Skia
- Signature capture as image
- Prevents signing without items added
- Enforces completion workflow before signing

### 8. **Export & Sharing**
- **Email Report**: Send detailed collection report via email
- **Share Report**: Export as text file and share via any app
- Professional formatted reports include:
  - Collection summary with totals
  - All item details with dimensions and values
  - Condition ratings and notes
  - Photo-specific condition notes
  - Signature information (if signed)
  - Timestamp and collection IDs
- Easy access via share icon in collection detail header

### 9. **Collection Workflow**
1. **Create Collection** (25%) → Enter customer and collection details
2. **Add Items** (50%) → Document items with photos and condition reports
3. **Mark as Completed** (75%) → Review all items
4. **Get Signature** (100%) → Client/manager approval with full item list
5. **Export & Share** → Send professional reports

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
- **Collections** - Main list view with search
- **NewCollection** - Modal for creating collections
- **CollectionDetail** - View collection with progress indicator and export
- **AddItem** - Modal for item details entry
- **Camera** - Full-screen camera for photo capture
- **ItemDetail** - View item details and photos
- **SignCollection** - Modal for signature capture with full item list

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
- **Expo Mail Composer** for email functionality
- **Expo Sharing** for report export
- **Expo File System** for report generation

## Improvements Inspired by Articheck

### Professional Standards
✅ **Standardized reporting** - Consistent, professional format for all reports
✅ **Real-time progress tracking** - Visual indicators show workflow status
✅ **Comprehensive documentation** - All item details, photos, and conditions
✅ **Digital signatures** - Legally verifiable proof of due care
✅ **Easy sharing** - Export and distribute reports via email or any app

### User Experience
✅ **Mobile-first design** - Optimized for field use by logistics teams
✅ **Intuitive workflow** - Clear progression through collection steps
✅ **No training required** - Self-explanatory interface
✅ **Multi-device support** - Works on iOS (Android compatible)

### Data Security & Organization
✅ **Unique IDs** - Every collection and item traceable
✅ **Audit trail** - Timestamps and employee tracking
✅ **Persistent storage** - Data saved locally with AsyncStorage
✅ **Complete visibility** - See all items before signing

### AI & Automation
✅ **AI Damage Detection** - GPT-4 Vision or Claude 3.5 Sonnet analyzes photos
✅ **Auto-detection** - Automatically analyze photos as they're taken (optional)
✅ **Manual analysis** - Trigger AI analysis on any photo from item detail view
✅ **Custom prompts** - Configure what the AI should look for
✅ **Model selection** - Choose between GPT-4o or Claude 3.5 Sonnet
✅ **Settings page** - Centralized configuration for all AI and printer settings

## Settings & Configuration

Access settings via the gear icon on the Collections screen. The settings page includes:

### AI Damage Detection Settings
- **Enable/Disable AI** - Toggle AI damage detection on or off
- **Auto-detect** - Automatically analyze photos when taken
- **AI Model Selection** - Choose between GPT-4 Vision or Claude 3.5 Sonnet
- **Custom AI Prompt** - Tell the AI what to look for in photos
- **Manual Trigger** - Analyze button available in photo note modal when AI is enabled

### Zebra Label Printer Settings (Planned)
- **Enable/Disable Printer** - Toggle label printing functionality
- **Printer IP Address** - Network address of Zebra printer
- **Printer Port** - Default 9100
- **Label Dimensions** - Width and height in inches (default 3x1)
- **Printer DPI** - Resolution: 203, 300, or 600 DPI

### General Settings
- **Company Name** - Your organization name for reports
- **Reset to Defaults** - Restore all settings to factory defaults

## AI Damage Detection

### Features
- **Vision AI Analysis**: Uses GPT-4 Vision or Claude 3.5 Sonnet to analyze photos
- **Automatic Detection**: Can automatically analyze photos as they're captured
- **Manual Analysis**: Tap "Analyze with AI" button in photo notes
- **Custom Instructions**: Configure what the AI should look for
- **AI Notes**: Analysis results clearly marked as "[AI Analysis]"
- **User Editable**: All AI-generated notes can be edited by users

### How It Works
1. Enable AI in Settings and optionally enable auto-detect
2. When taking photos, AI automatically analyzes if auto-detect is on
3. Alternatively, open any photo's note modal and tap "Analyze with AI"
4. AI examines the photo and generates a condition report
5. Results appear in the note field with "[AI Analysis]" header
6. Edit or append to AI-generated notes as needed

## Future Enhancements

### Additional Features (In Progress)
- **Image Annotation** - Draw on photos to mark damage locations
- **QR Code Generation** - Generate QR codes for collections and items
- **QR Code Scanning** - Quick item and collection identification
- **Zebra Label Printing** - Print QR code labels with ZPL commands
- **PDF Export** - Generate printable PDF reports (requires expo-print package)
- **Customer Management** - Pick existing customers or create new ones
- **View-Only Mode** - Prevent modifications to signed collections

### Long-Term Recommendations
- **Cloud sync** - Backup collections to cloud storage
- **Team collaboration** - Share collections between team members
- **Custom templates** - Pre-fill common item types
- **Analytics dashboard** - Track collection trends and statistics
- **Photo comparison** - Before/after condition comparison
- **Integration APIs** - Connect with warehouse management systems

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
5. **Track Progress**: Watch the progress bar advance from 25% to 75%
6. **Mark Complete**: Once all items documented, mark collection as completed
7. **Get Signature**: Have client/manager sign after reviewing all items
8. **Export**: Use share icon to email or share the complete collection report

## Fixes & Improvements Implemented

### Critical Fixes
✅ **Camera unmounting** - Camera now properly closes when photos are done
✅ **Signature screen items** - All collected items now displayed with photos before signing
✅ **Collection totals** - Total value and photo count calculated and displayed

### New Features
✅ **Progress indicator** - Visual progress bar shows workflow completion
✅ **Export functionality** - Email and share collection reports
✅ **Professional reports** - Formatted text reports with all details
✅ **Better workflow** - Clear progression through collection steps
✅ **Settings page** - Centralized configuration for AI and printer
✅ **AI damage detection** - GPT-4 Vision or Claude 3.5 Sonnet integration
✅ **Auto-analysis** - Optional automatic photo analysis
✅ **Manual AI trigger** - Analyze button in photo note modal

## Notes
- Collections cannot be signed without at least one item
- Signed collections cannot be modified
- All timestamps are in milliseconds since epoch
- Photos are stored as local file URIs
- Signature is captured as PNG image
- Total values converted to USD for consistency (EUR ×1.1, GBP ×1.25)

---

Built for professional art logistics teams who demand accuracy and reliability.

