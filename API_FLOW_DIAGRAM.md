# API Flow Diagram - MobileDocuments

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MobileDocuments Component                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Component Mount │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │ Fetch Profile   │        │ Fetch Documents  │
        └─────────────────┘        └──────────────────┘
                │                           │
                ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │ GET /profiles   │        │ GET /documents   │
        │ /{profileId}    │        │                  │
        └─────────────────┘        └──────────────────┘
                │                           │
                ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │ Profile Data    │        │ Documents List   │
        │ Loaded          │        │ Loaded           │
        └─────────────────┘        └──────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Render UI        │
                    │ - Profile Info   │
                    │ - Documents List │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ User Clicks Doc  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Show Preview     │
                    │ Sheet            │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Fetch Full Doc   │
                    │ GET /documents   │
                    │ /{documentId}    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Render PDF       │
                    │ with Profile     │
                    │ Data             │
                    └──────────────────┘
```

## Request/Response Flow

### 1. Profile Fetch

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST                                   │
├─────────────────────────────────────────────────────────────┤
│ GET /profiles/{profileId}                                   │
│                                                              │
│ Headers:                                                     │
│ - Authorization: Bearer {accessToken}                       │
│ - X-Device-ID: {deviceId}                                   │
│ - X-Profile-ID: {profileId}                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE (200 OK)                         │
├─────────────────────────────────────────────────────────────┤
│ {                                                            │
│   "id": "507f1f77bcf86cd799439011",                         │
│   "businessName": "ABC Enterprises",                        │
│   "ownerName": "John Doe",                                  │
│   "email": "john@example.com",                              │
│   "phone": "+91XXXXXXXXXX",                                 │
│   "address": "123 Main St",                                 │
│   "createdAt": "2024-01-15T10:30:00Z",                      │
│   "updatedAt": "2024-01-15T10:30:00Z"                       │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Store in State   │
                    │ setProfile(data) │
                    └──────────────────┘
```

### 2. Documents Fetch

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST                                   │
├─────────────────────────────────────────────────────────────┤
│ GET /documents                                              │
│                                                              │
│ Headers:                                                     │
│ - Authorization: Bearer {accessToken}                       │
│ - X-Device-ID: {deviceId}                                   │
│ - X-Profile-ID: {profileId}                                 │
│                                                              │
│ Optional Query Parameters:                                  │
│ - limit: 50                                                 │
│ - skip: 0                                                   │
│ - from: 2024-01-01                                          │
│ - to: 2024-12-31                                            │
│ - type: invoice                                             │
│ - status: unpaid                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE (200 OK)                         │
├─────────────────────────────────────────────────────────────┤
│ Option 1: Array Format                                      │
│ [                                                            │
│   {                                                          │
│     "id": "507f1f77bcf86cd799439012",                       │
│     "documentType": "invoice",                              │
│     "invoiceNo": "INV-001",                                 │
│     "documentNumber": "INVOICE/2024-25/00001",              │
│     "partyName": "XYZ Corp",                                │
│     "date": "2024-01-15",                                   │
│     "grandTotal": 50000                                     │
│   },                                                         │
│   ...                                                        │
│ ]                                                            │
│                                                              │
│ Option 2: Paginated Format                                  │
│ {                                                            │
│   "data": [...],                                            │
│   "total": 150,                                             │
│   "limit": 50,                                              │
│   "skip": 0,                                                │
│   "hasMore": true                                           │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Handle Format    │
                    │ const docList =  │
                    │ Array.isArray()? │
                    │ data : data.data │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Store in State   │
                    │ setDocs(docList) │
                    └──────────────────┘
```

### 3. Document Detail Fetch

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST                                   │
├─────────────────────────────────────────────────────────────┤
│ GET /documents/{documentId}                                 │
│                                                              │
│ Headers:                                                     │
│ - Authorization: Bearer {accessToken}                       │
│ - X-Device-ID: {deviceId}                                   │
│ - X-Profile-ID: {profileId}                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE (200 OK)                         │
├─────────────────────────────────────────────────────────────┤
│ {                                                            │
│   "id": "507f1f77bcf86cd799439012",                         │
│   "documentType": "invoice",                                │
│   "invoiceNo": "INV-001",                                   │
│   "documentNumber": "INVOICE/2024-25/00001",                │
│   "partyName": "XYZ Corp",                                  │
│   "date": "2024-01-15",                                     │
│   "grandTotal": 50000,                                      │
│   "items": [                                                │
│     {                                                        │
│       "itemId": "507f1f77bcf86cd799439013",                 │
│       "itemName": "Product A",                              │
│       "quantity": 10,                                       │
│       "rate": 5000,                                         │
│       "amount": 50000                                       │
│     }                                                        │
│   ],                                                         │
│   "customerId": "507f1f77bcf86cd799439014",                 │
│   "customerName": "XYZ Corp",                               │
│   "paymentStatus": "unpaid",                                │
│   "status": "final",                                        │
│   "createdAt": "2024-01-15T10:30:00Z",                      │
│   "updatedAt": "2024-01-15T10:30:00Z"                       │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Render PDF       │
                    │ with Profile     │
                    │ Data             │
                    └──────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    API Request                               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │ Success (200)   │        │ Error (4xx/5xx)  │
        └─────────────────┘        └──────────────────┘
                │                           │
                ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │ Parse Response  │        │ Parse Error      │
        │ Store in State  │        │ Log Error        │
        └─────────────────┘        └──────────────────┘
                │                           │
                ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │ Render UI       │        │ Show Fallback    │
        │ with Data       │        │ or Toast Error   │
        └─────────────────┘        └──────────────────┘
```

## State Management

```
MobileDocuments Component State:

┌─────────────────────────────────────────────────────────────┐
│ State Variables                                              │
├─────────────────────────────────────────────────────────────┤
│ docs: DocumentRecord[]                                      │
│   └─ Array of documents from GET /documents                 │
│                                                              │
│ profile: PdfProfile | null                                  │
│   └─ Profile data from GET /profiles/{id}                   │
│                                                              │
│ search: string                                              │
│   └─ Search query for filtering documents                   │
│                                                              │
│ loading: boolean                                            │
│   └─ Loading state for documents fetch                      │
│                                                              │
│ selectedDoc: DocumentRecord | null                          │
│   └─ Currently selected document for preview                │
└─────────────────────────────────────────────────────────────┘
```

## Headers Configuration

```
┌─────────────────────────────────────────────────────────────┐
│ Headers Object (Memoized)                                   │
├─────────────────────────────────────────────────────────────┤
│ {                                                            │
│   Authorization: `Bearer ${accessToken}`,                   │
│   'X-Device-ID': deviceId || '',                            │
│   'X-Profile-ID': profileId || ''                           │
│ }                                                            │
│                                                              │
│ Dependencies: [accessToken, deviceId, profileId]            │
│ Recalculates when any dependency changes                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Lifecycle

```
1. Component Mount
   ├─ Initialize state
   ├─ Get auth context (accessToken, deviceId)
   ├─ Get profile context (profileId)
   └─ Memoize headers

2. Effect 1: Load Profile
   ├─ Check dependencies (accessToken, deviceId, profileId)
   ├─ Fetch GET /profiles/{profileId}
   ├─ Parse response
   ├─ Store in state or use fallback
   └─ Log errors

3. Effect 2: Load Documents
   ├─ Check dependencies (accessToken, deviceId, profileId)
   ├─ Fetch GET /documents
   ├─ Handle array or paginated response
   ├─ Store in state
   └─ Show toast on error

4. Render
   ├─ Show skeleton if loading
   ├─ Display profile info
   ├─ Display documents list
   ├─ Show search input
   └─ Show filtered documents

5. User Interaction
   ├─ Click document
   ├─ Show PdfPreviewSheet
   ├─ Fetch GET /documents/{id}
   ├─ Render PDF with profile data
   └─ Allow download/fullscreen
```

## API Endpoint Summary

```
┌─────────────────────────────────────────────────────────────┐
│ Endpoint                │ Method │ Purpose                  │
├─────────────────────────────────────────────────────────────┤
│ /profiles/{id}          │ GET    │ Fetch profile data       │
│ /documents              │ GET    │ Fetch documents list     │
│ /documents/{id}         │ GET    │ Fetch single document    │
│ /documents              │ POST   │ Create document          │
│ /documents/{id}         │ PUT    │ Update document          │
│ /documents/{id}         │ DELETE │ Delete document          │
│ /documents/{id}/remind  │ POST   │ Send SMS reminder        │
│ /documents/{id}/duplicate│ POST  │ Duplicate document       │
│ /documents/{id}/convert │ POST   │ Convert document type    │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│ Optimization Techniques                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Memoized Headers
│    └─ Prevents unnecessary re-renders
│
│ 2. Memoized Filtered Docs
│    └─ Efficient search filtering
│
│ 3. Backend Caching
│    └─ 30-second cache on documents list
│
│ 4. Response Format Handling
│    └─ Supports both array and paginated formats
│
│ 5. Fallback Profile
│    └─ Graceful degradation on profile fetch failure
│
│ 6. Lazy Loading
│    └─ Documents loaded on demand
└─────────────────────────────────────────────────────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Security Checks                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Authentication
│    └─ Bearer token in Authorization header
│
│ 2. Device Validation
│    └─ X-Device-ID header
│
│ 3. Profile Scoping
│    └─ X-Profile-ID header
│
│ 4. Backend Validation
│    └─ Verify user owns profile and documents
│
│ 5. Error Handling
│    └─ Don't expose sensitive error details
└─────────────────────────────────────────────────────────────┘
```
