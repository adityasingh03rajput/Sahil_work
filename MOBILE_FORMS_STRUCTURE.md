# Mobile Forms Structure - Visual Guide

## Customer Form Structure

```
┌─────────────────────────────────────┐
│         Add Customer                │
├─────────────────────────────────────┤
│                                     │
│  BASIC INFO                         │
│  ├─ Party / Business Name *         │
│  └─ Owner Name                      │
│                                     │
│  CONTACT INFO                       │
│  ├─ Phone                           │
│  └─ Email                           │
│                                     │
│  TAX & ID                           │
│  ├─ GSTIN                           │
│  └─ PAN                             │
│                                     │
│  BILLING ADDRESS                    │
│  ├─ Address                         │
│  ├─ City                            │
│  ├─ State                           │
│  └─ Postal Code                     │
│                                     │
│  OPENING BALANCE                    │
│  ├─ Amount                          │
│  └─ Type (DR/CR)                    │
│                                     │
├─────────────────────────────────────┤
│  [Cancel]  [Add Customer]           │
└─────────────────────────────────────┘
```

---

## Item Form Structure

```
┌─────────────────────────────────────┐
│         Add Item                    │
├─────────────────────────────────────┤
│                                     │
│  BASIC INFO                         │
│  ├─ Item Name *                     │
│  ├─ HSN/SAC Code                    │
│  └─ Unit                            │
│                                     │
│  PRICING                            │
│  ├─ Rate (₹)                        │
│  ├─ Selling Price (₹)               │
│  ├─ Purchase Cost (₹)               │
│  └─ Discount %                      │
│                                     │
│  TAX RATES                          │
│  ├─ CGST %                          │
│  ├─ SGST %                          │
│  └─ IGST %                          │
│                                     │
│  ADDITIONAL                         │
│  └─ Description                     │
│                                     │
├─────────────────────────────────────┤
│  [Cancel]  [Add Item]               │
└─────────────────────────────────────┘
```

---

## Field Details

### Customer Form Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | text | Yes | - | Party/Business name |
| ownerName | text | No | - | Owner/Proprietor name |
| phone | tel | No | - | Phone number |
| email | email | No | - | Email address |
| gstin | text | No | - | 15-char GSTIN |
| pan | text | No | - | 10-char PAN |
| billingAddress | textarea | No | - | Street address |
| billingCity | text | No | - | City name |
| billingState | text | No | - | State name |
| billingPostalCode | text | No | - | 6-digit postal code |
| openingBalance | number | No | 0 | Opening balance amount |
| openingBalanceType | select | No | 'dr' | DR (Receivable) or CR (Payable) |

**Note**: Shipping address is automatically set to match billing address

---

### Item Form Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| name | text | Yes | - | Item/Product name |
| hsnSac | text | No | - | HSN or SAC code |
| unit | text | No | 'pcs' | Unit of measurement |
| rate | number | No | 0 | Base rate |
| sellingPrice | number | No | 0 | Selling price |
| purchaseCost | number | No | 0 | Purchase cost |
| discount | number | No | 0 | Discount percentage |
| cgst | number | No | 9 | CGST percentage |
| sgst | number | No | 9 | SGST percentage |
| igst | number | No | 0 | IGST percentage |
| description | textarea | No | - | Item description |

---

## Input Types & Validation

### Customer Form
```javascript
// Phone
<input type="tel" inputMode="tel" placeholder="+91 98765 43210" />

// Email
<input type="email" inputMode="email" placeholder="email@example.com" />

// GSTIN/PAN
<input type="text" autoCapitalize="characters" placeholder="22AAAAA0000A1Z5" />

// Opening Balance
<input type="number" inputMode="decimal" step="0.01" placeholder="0.00" />

// Opening Type
<select>
  <option value="dr">DR (Receivable)</option>
  <option value="cr">CR (Payable)</option>
</select>
```

### Item Form
```javascript
// Rate, Selling Price, Purchase Cost
<input type="number" inputMode="decimal" step="0.01" placeholder="0.00" />

// Discount, Tax Rates
<input type="number" inputMode="decimal" step="0.01" placeholder="0" />

// Description
<textarea placeholder="Item description (optional)" rows={4} />
```

---

## Form Behavior

### On Submit
1. Validate required fields (name)
2. Show error toast if validation fails
3. Send POST request to API
4. Show success/error toast
5. Close form on success
6. Refresh list on success

### Data Handling
- All numeric fields converted to numbers
- Shipping address auto-synced with billing
- Empty strings converted to undefined
- Proper error handling with user feedback

---

## Mobile Responsiveness

### Layout
- Full-width form on mobile
- Scrollable content area
- Fixed header and footer
- Safe area padding for notches

### Touch Targets
- All inputs: 44px+ height
- All buttons: 48px height
- Proper spacing between fields
- Easy to tap on mobile

### Keyboard
- Proper `inputMode` for numeric keyboards
- `autoCapitalize` for uppercase fields
- `autoCorrect="off"` for codes
- Smooth keyboard transitions

---

## Accessibility

### Labels
- All inputs have associated labels
- Required fields marked with asterisk (*)
- Clear placeholder text
- Proper label styling

### Keyboard Navigation
- Tab order follows visual order
- Enter key submits form
- Escape key closes form
- Focus visible on all inputs

### Screen Readers
- Semantic HTML structure
- Proper label associations
- Error messages announced
- Loading states indicated

---

## Summary

✅ **Complete Parity**: Mobile forms now match website exactly
✅ **Better Organization**: Logical section headers
✅ **Proper Validation**: Required fields and error handling
✅ **Mobile Optimized**: Touch targets, keyboard, responsive
✅ **Accessible**: Labels, keyboard nav, screen reader support
