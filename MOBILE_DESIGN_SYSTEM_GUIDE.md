# Mobile Design System - Quick Start Guide

## Overview

The Mobile Design System (`src/app/mobile/MobileDesignSystem.tsx`) provides:
- **Centralized design tokens** - Colors, spacing, typography, etc.
- **Reusable styles** - Pre-built style objects for common components
- **Utility functions** - Formatting, calculations, etc.
- **Reusable components** - Ready-to-use React components

## Usage Examples

### 1. Using Design Tokens

```tsx
import { MOBILE_TOKENS } from '../mobile/MobileDesignSystem';

// Access colors
const bgColor = MOBILE_TOKENS.colors.bg;        // '#0f172a'
const accentColor = MOBILE_TOKENS.colors.accent; // '#6366f1'

// Access spacing
const padding = MOBILE_TOKENS.spacing.md;       // 12
const gap = MOBILE_TOKENS.spacing.lg;           // 16

// Access typography
const heading = MOBILE_TOKENS.typography.h1;    // { fontSize: 28, fontWeight: 900, ... }

// Access radius
const borderRadius = MOBILE_TOKENS.radius.lg;   // 16

// Touch target minimum
const minHeight = MOBILE_TOKENS.touchTarget;    // 44
```

### 2. Using Reusable Styles

```tsx
import { MOBILE_STYLES } from '../mobile/MobileDesignSystem';

// Page container
<div style={MOBILE_STYLES.page}>
  {/* Content */}
</div>

// Card
<div style={MOBILE_STYLES.card}>
  {/* Card content */}
</div>

// Button
<button style={MOBILE_STYLES.button('primary')}>
  Click me
</button>

// Input
<input style={MOBILE_STYLES.input} placeholder="Enter text" />

// Label
<label style={MOBILE_STYLES.label}>Form Label</label>

// List item
<div style={MOBILE_STYLES.listItem}>
  <span>Item name</span>
  <span>Value</span>
</div>

// Sheet (bottom drawer)
<div style={MOBILE_STYLES.sheet}>
  <div style={MOBILE_STYLES.sheetOverlay} onClick={onClose} />
  <div style={MOBILE_STYLES.sheetContent}>
    <div style={MOBILE_STYLES.sheetHandle}>
      <div style={MOBILE_STYLES.sheetHandleBar} />
    </div>
    <div style={MOBILE_STYLES.sheetHeader}>
      <span>Sheet Title</span>
      <button onClick={onClose}>×</button>
    </div>
    <div style={MOBILE_STYLES.sheetBody}>
      {/* Sheet content */}
    </div>
  </div>
</div>
```

### 3. Using Utility Functions

```tsx
import { formatCurrency, formatDate, formatDateTime } from '../mobile/MobileDesignSystem';

// Format currency
const price = formatCurrency(1500);        // "₹1,500"
const amount = formatCurrency(50000);      // "₹50,000"

// Format date
const date = formatDate('2024-04-13');     // "13 Apr"
const today = formatDate(new Date());      // "13 Apr"

// Format date with time
const dateTime = formatDateTime('2024-04-13T14:30:00'); // "13 Apr 2:30 PM"
```

### 4. Using Reusable Components

```tsx
import {
  MobileSkeleton,
  MobileButton,
  MobileCard,
  MobileInput,
  MobileLabel,
} from '../mobile/MobileDesignSystem';

// Skeleton loader
<MobileSkeleton count={4} />

// Button
<MobileButton variant="primary" onClick={handleClick}>
  Save
</MobileButton>

<MobileButton variant="secondary" onClick={handleCancel}>
  Cancel
</MobileButton>

<MobileButton variant="ghost" onClick={handleDelete}>
  Delete
</MobileButton>

// Card
<MobileCard>
  <h3>Card Title</h3>
  <p>Card content</p>
</MobileCard>

// Input
<MobileInput
  placeholder="Enter name"
  value={name}
  onChange={setName}
/>

// Label
<MobileLabel>Customer Name</MobileLabel>
```

## Refactoring Example

### Before (Hardcoded styles):
```tsx
function MobileCustomers() {
  return (
    <div style={{ padding: '16px 16px calc(env(safe-area-inset-bottom,0px) + 100px)', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#1e293b', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>Customers</div>
      </div>
      <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#fff', background: '#6366f1' }}>
        Add Customer
      </button>
    </div>
  );
}
```

### After (Using design system):
```tsx
import { MOBILE_STYLES, MobileCard, MobileButton } from '../mobile/MobileDesignSystem';

function MobileCustomers() {
  return (
    <div style={MOBILE_STYLES.page}>
      <MobileCard>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Customers</h1>
      </MobileCard>
      <MobileButton variant="primary" onClick={handleAddCustomer}>
        Add Customer
      </MobileButton>
    </div>
  );
}
```

## Design Token Reference

### Colors
```
bg              #0f172a    Dark navy base
surface         #1e293b    Card/surface
surfaceAlt      #334155    Alternate surface
border          rgba(255,255,255,0.08)
borderLight     rgba(255,255,255,0.15)
text            #f1f5f9    Primary text
textMuted       rgba(255,255,255,0.6)
textSecondary   rgba(255,255,255,0.4)
accent          #6366f1    Primary accent
accentAlt       #0ea5e9    Secondary accent
success         #10b981
warning         #f59e0b
error           #ef4444
overlay         rgba(0,0,0,0.6)
```

### Spacing
```
xs              4px
sm              8px
md              12px
lg              16px
xl              20px
xxl             24px
```

### Border Radius
```
sm              8px
md              12px
lg              16px
xl              20px
full            999px
```

### Typography
```
h1              fontSize: 28, fontWeight: 900
h2              fontSize: 24, fontWeight: 800
h3              fontSize: 20, fontWeight: 700
body            fontSize: 15, fontWeight: 400
bodySmall       fontSize: 13, fontWeight: 400
label           fontSize: 11, fontWeight: 700
caption         fontSize: 10, fontWeight: 600
```

## Best Practices

1. **Always use design tokens** - Never hardcode colors, spacing, or typography
2. **Use reusable components** - Don't create custom button/card styles
3. **Maintain consistency** - Use the same spacing and colors across pages
4. **Respect touch targets** - Ensure buttons are at least 44px tall
5. **Handle safe areas** - Use `MOBILE_TOKENS.safeAreaBottom` for bottom padding
6. **Use utility functions** - Format dates and currency consistently
7. **Extend carefully** - Add new tokens to the design system, don't override

## Adding New Tokens

To add new design tokens, update `MOBILE_TOKENS` in `MobileDesignSystem.tsx`:

```tsx
export const MOBILE_TOKENS = {
  // ... existing tokens
  
  // New token
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
};
```

Then use it:
```tsx
<div style={{ boxShadow: MOBILE_TOKENS.shadows.md }}>
  {/* Content */}
</div>
```

## Troubleshooting

### Styles not applying?
- Check that you're importing from the correct path
- Verify the style object is being spread correctly: `style={{ ...MOBILE_STYLES.card }}`
- Check for conflicting inline styles

### Colors look wrong?
- Verify you're using the correct color token
- Check that the theme context is properly set up
- Use browser DevTools to inspect the computed styles

### Touch targets too small?
- Ensure buttons have `minHeight: MOBILE_TOKENS.touchTarget` (44px)
- Use `MOBILE_STYLES.button()` which includes this automatically
- Test on actual mobile devices

## Migration Checklist

When refactoring a mobile component:
- [ ] Replace hardcoded colors with `MOBILE_TOKENS.colors`
- [ ] Replace hardcoded spacing with `MOBILE_TOKENS.spacing`
- [ ] Replace hardcoded typography with `MOBILE_TOKENS.typography`
- [ ] Replace custom button styles with `MOBILE_STYLES.button()`
- [ ] Replace custom input styles with `MOBILE_STYLES.input`
- [ ] Replace custom card styles with `MOBILE_STYLES.card`
- [ ] Use utility functions for formatting (currency, dates)
- [ ] Use reusable components where applicable
- [ ] Test on mobile devices
- [ ] Verify touch targets are >= 44px
- [ ] Check safe area handling

## Support

For questions or issues with the design system:
1. Check this guide first
2. Review the `MobileDesignSystem.tsx` source code
3. Look at existing mobile components for examples
4. Test in browser DevTools mobile emulation
