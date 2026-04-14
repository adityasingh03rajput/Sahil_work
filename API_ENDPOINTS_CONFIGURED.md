# API Endpoints Configuration - MobileDocuments

## Summary
All API endpoints for MobileDocuments component have been properly configured with correct headers, error handling, and response parsing.

## Configured Endpoints

### 1. **GET /profiles/:id** (NEW)
- **Purpose**: Fetch business profile data
- **Location**: `backend/src/routes/profiles.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Response**: Profile object with businessName, ownerName, and other profile data
- **Usage in MobileDocuments**: Fetches profile data for PDF rendering
- **Error Handling**: Falls back to default profile if fetch fails

### 2. **GET /documents**
- **Purpose**: Fetch list of documents with pagination and filtering
- **Location**: `backend/src/routes/documents.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Query Parameters**:
  - `limit`: Number of documents per page (default: 50, max: 200)
  - `skip`: Number of documents to skip for pagination (default: 0)
  - `from`: Start date in YYYY-MM-DD format (optional)
  - `to`: End date in YYYY-MM-DD format (optional)
  - `type`: Document type filter (invoice, quotation, purchase, order, proforma, challan, invoice_cancellation)
  - `status`: Payment status filter (paid, unpaid, draft)
- **Response**: 
  - Array format: `[{id, documentType, invoiceNo, date, grandTotal, ...}]`
  - Paginated format: `{data: [...], total, limit, skip, hasMore}`
- **Usage in MobileDocuments**: Fetches all documents for the current profile
- **Error Handling**: Shows toast error if fetch fails

### 3. **GET /documents/:id**
- **Purpose**: Fetch single document by ID with full details
- **Location**: `backend/src/routes/documents.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Response**: Complete document object with all fields including items, ledger entries, etc.
- **Usage in MobileDocuments**: Fetched via `fetchDocumentById()` utility in PdfPreviewSheet
- **Error Handling**: Shows toast error if fetch fails

### 4. **POST /documents/:id/remind**
- **Purpose**: Send SMS reminder for unpaid invoices
- **Location**: `backend/src/routes/documents.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Request Body**:
  ```json
  {
    "channel": "sms",
    "to": "+91XXXXXXXXXX",
    "message": "Optional custom message"
  }
  ```
- **Response**: `{ok: true, status: 'sent', lastReminderSentAt: ISO8601}`
- **Note**: Requires Twilio configuration and active subscription feature

### 5. **DELETE /documents/:id**
- **Purpose**: Delete a document
- **Location**: `backend/src/routes/documents.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Restrictions**: Cannot delete finalized documents
- **Response**: `{ok: true}`

### 6. **POST /documents/:id/duplicate**
- **Purpose**: Create a duplicate of an existing document
- **Location**: `backend/src/routes/documents.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Response**: New document object with draft status

### 7. **POST /documents/:id/convert**
- **Purpose**: Convert document to different type
- **Location**: `backend/src/routes/documents.js`
- **Headers Required**:
  - `Authorization: Bearer {accessToken}`
  - `X-Device-ID: {deviceId}`
  - `X-Profile-ID: {profileId}`
- **Request Body**: `{targetType: "quotation"}`
- **Response**: New document object with converted type

## Implementation Details

### MobileDocuments Component
**File**: `src/app/mobile/MobileDocuments.tsx`

#### Headers Configuration
```typescript
const headers = useMemo(() => ({
  Authorization: `Bearer ${accessToken}`,
  'X-Device-ID': deviceId || '',
  'X-Profile-ID': profileId || '',
}), [accessToken, deviceId, profileId]);
```

#### Profile Fetch
```typescript
useEffect(() => {
  const loadProfile = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    try {
      const res = await fetch(`${API_URL}/profiles/${profileId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
      setProfile({
        id: data.id || profileId,
        businessName: data.businessName || 'Your Business',
        ownerName: data.ownerName || 'Owner',
        ...data,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      console.error('Profile load error:', message);
      setProfile({
        id: profileId || '',
        businessName: 'Your Business',
        ownerName: 'Owner',
      });
    }
  };
  loadProfile();
}, [accessToken, deviceId, profileId, headers]);
```

#### Documents Fetch
```typescript
useEffect(() => {
  const load = async () => {
    if (!accessToken || !deviceId || !profileId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/documents`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load documents');
      // Handle both array and paginated response
      const docList = Array.isArray(data) ? data : (data?.data || []);
      setDocs(docList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load documents';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  load();
}, [accessToken, deviceId, profileId, headers]);
```

## API URL Configuration
**File**: `src/app/config/api.ts`

- **Default API URL**: `https://billvyapar-backend.fly.dev`
- **Native APK**: Strictly uses default URL (no overrides allowed)
- **Web**: Can use localStorage override for development

## Error Handling Strategy

1. **Profile Load Errors**: Falls back to default profile values
2. **Documents Load Errors**: Shows toast notification to user
3. **Network Errors**: Caught and logged with descriptive messages
4. **Response Validation**: Checks `res.ok` before processing data

## Response Format Handling

The component handles both response formats:
```typescript
// Array format (direct list)
const docList = Array.isArray(data) ? data : (data?.data || []);

// Paginated format
{
  data: [...],
  total: number,
  limit: number,
  skip: number,
  hasMore: boolean
}
```

## Testing Checklist

- [ ] Profile data loads correctly on app startup
- [ ] Documents list displays all documents
- [ ] Search filters documents by invoice number and party name
- [ ] PDF preview loads document details correctly
- [ ] Theme colors apply correctly to all UI elements
- [ ] Display scale adjusts spacing and font sizes
- [ ] Error messages display when API calls fail
- [ ] Fallback profile data displays when profile fetch fails
- [ ] Headers include all required authentication fields

## Files Modified

1. `src/app/mobile/MobileDocuments.tsx` - Added profile fetch, improved error handling
2. `backend/src/routes/profiles.js` - Added GET /:id endpoint
3. `src/app/config/api.ts` - Already properly configured

## Next Steps

1. Build APK and test on actual Android device
2. Verify all API endpoints respond correctly
3. Test error scenarios (network failures, invalid tokens)
4. Monitor performance with actual data
