# API Quick Reference - MobileDocuments

## Base URL
```
https://billvyapar-backend.fly.dev
```

## Required Headers (All Requests)
```
Authorization: Bearer {accessToken}
X-Device-ID: {deviceId}
X-Profile-ID: {profileId}
```

## Endpoints Used in MobileDocuments

### 1. Get Profile Data
```
GET /profiles/{profileId}

Response:
{
  id: string,
  businessName: string,
  ownerName: string,
  [other profile fields]
}
```

### 2. Get Documents List
```
GET /documents

Query Parameters (optional):
- limit: 1-200 (default: 50)
- skip: 0+ (default: 0)
- from: YYYY-MM-DD
- to: YYYY-MM-DD
- type: invoice|quotation|purchase|order|proforma|challan|invoice_cancellation
- status: paid|unpaid|draft

Response (Array):
[
  {
    id: string,
    documentType: string,
    invoiceNo: string,
    documentNumber: string,
    partyName: string,
    date: string (YYYY-MM-DD),
    grandTotal: number
  },
  ...
]

Response (Paginated):
{
  data: [...],
  total: number,
  limit: number,
  skip: number,
  hasMore: boolean
}
```

### 3. Get Single Document
```
GET /documents/{documentId}

Response:
{
  id: string,
  documentType: string,
  invoiceNo: string,
  documentNumber: string,
  partyName: string,
  date: string,
  grandTotal: number,
  items: [...],
  [all document fields]
}
```

## Implementation in MobileDocuments

### Profile Fetch
```typescript
const res = await fetch(`${API_URL}/profiles/${profileId}`, { headers });
const data = await res.json();
if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
```

### Documents Fetch
```typescript
const res = await fetch(`${API_URL}/documents`, { headers });
const data = await res.json();
if (!res.ok) throw new Error(data?.error || 'Failed to load documents');
const docList = Array.isArray(data) ? data : (data?.data || []);
```

### Document Detail Fetch (in PdfPreviewSheet)
```typescript
const fullDoc = await fetchDocumentById({
  apiUrl: API_URL,
  accessToken,
  deviceId,
  profileId,
  documentId: doc.id
});
```

## Error Handling

### Profile Load
- **Success**: Profile data stored in state
- **Failure**: Falls back to default profile with businessName and ownerName

### Documents Load
- **Success**: Documents list displayed
- **Failure**: Toast error shown to user

### Document Detail Load
- **Success**: PDF preview rendered
- **Failure**: Toast error shown to user

## Status Codes

- **200**: Success
- **400**: Bad request (invalid parameters)
- **401**: Unauthorized (invalid token)
- **403**: Forbidden (subscription limit reached)
- **404**: Not found (document/profile doesn't exist)
- **500**: Server error

## Common Issues & Solutions

### Profile Not Loading
- Check if profileId is valid
- Verify Authorization header is correct
- Check if profile exists in database

### Documents Not Loading
- Check if documents exist for the profile
- Verify date range parameters are valid (YYYY-MM-DD format)
- Check if subscription is active

### PDF Preview Not Loading
- Verify document ID is correct
- Check if document has all required fields
- Verify profile data is loaded first

## Testing with curl

```bash
# Get profile
curl -H "Authorization: Bearer {token}" \
     -H "X-Device-ID: {deviceId}" \
     -H "X-Profile-ID: {profileId}" \
     https://billvyapar-backend.fly.dev/profiles/{profileId}

# Get documents
curl -H "Authorization: Bearer {token}" \
     -H "X-Device-ID: {deviceId}" \
     -H "X-Profile-ID: {profileId}" \
     https://billvyapar-backend.fly.dev/documents

# Get single document
curl -H "Authorization: Bearer {token}" \
     -H "X-Device-ID: {deviceId}" \
     -H "X-Profile-ID: {profileId}" \
     https://billvyapar-backend.fly.dev/documents/{documentId}
```

## Performance Notes

- Documents list is cached for 30 seconds (Cache-Control: max-age=30)
- Heavy fields (reminderLogs, internalNotes, items) excluded from list view
- Pagination recommended for large datasets (use limit and skip)
- Profile data cached in component state

## Security Notes

- All requests require valid authentication token
- Device ID and Profile ID must match authenticated user
- Finalized documents cannot be deleted
- Financial fields locked on finalized documents
