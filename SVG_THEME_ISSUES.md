# SVG Theme Issues - Complete Analysis

## Problems Found

### 1. **MobileLayout.tsx - Line 646**
Hardcoded SVG stroke color:
```jsx
<svg stroke="rgba(255,255,255,0.6)" ...>
```
This SVG icon for "Display Size" is always light gray, doesn't respond to theme changes.

### 2. **EmployeeAttendancePage.tsx - Lines 540, 1020**
Hardcoded SVG stroke colors:
```jsx
// Line 540 - Pull-to-refresh icon
<svg stroke="#818cf8" ...>  // Always indigo

// Line 1020 - Checkmark icon
<svg stroke="#0f172a" ...>  // Always dark navy
```

### 3. **Icon Components in EmployeeAttendancePage.tsx - Lines 86-93**
SVG icons using `stroke="currentColor"` - These are GOOD, they inherit color from parent.

## Root Cause

SVGs with hardcoded `stroke` and `fill` attributes don't respond to CSS variable changes. They need to either:
1. Use `currentColor` to inherit from parent text color
2. Use CSS variables via inline styles
3. Use dynamic color props

## Solution

### For MobileLayout.tsx (Line 646)
Change from hardcoded color to CSS variable:
```jsx
// BEFORE
<svg stroke="rgba(255,255,255,0.6)" ...>

// AFTER
<svg stroke="var(--muted-foreground)" ...>
```

### For EmployeeAttendancePage.tsx (Line 540)
Change from hardcoded indigo to CSS variable:
```jsx
// BEFORE
<svg stroke="#818cf8" ...>

// AFTER
<svg stroke="var(--primary)" ...>
```

### For EmployeeAttendancePage.tsx (Line 1020)
Change from hardcoded dark navy to CSS variable:
```jsx
// BEFORE
<svg stroke="#0f172a" ...>

// AFTER
<svg stroke="var(--foreground)" ...>
```

## CSS Variables Available

From theme.css, these variables are theme-aware:
- `--foreground` - Primary text color (changes with theme)
- `--muted-foreground` - Muted text color (changes with theme)
- `--primary` - Primary accent color (changes with theme)
- `--secondary` - Secondary accent color (changes with theme)
- `--background` - Background color (changes with theme)
- `--card` - Card background (changes with theme)
- `--border` - Border color (changes with theme)

## Files to Fix

1. **src/app/components/MobileLayout.tsx** - Line 646
2. **src/app/pages/EmployeeAttendancePage.tsx** - Lines 540, 1020

## Testing

After fixes:
1. Build APK
2. Test each theme:
   - Light
   - Dark
   - Warm
   - Ocean
   - Emerald
   - Rosewood
3. Verify SVG icons change color with theme
