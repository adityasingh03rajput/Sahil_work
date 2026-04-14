# "More" Button Flow - Complete Analysis

## Overview
When user taps the "...more" button (MoreHorizontal icon) in the bottom navigation, a slide-up drawer sheet opens with multiple sections and options.

---

## Flow Diagram

```
User taps "More" button (MoreHorizontal icon)
    ↓
openMore() function triggered
    ↓
setSheetVisible(true) - Makes sheet visible
    ↓
requestAnimationFrame → setSheetOpen(true) - Animates sheet up
    ↓
More Sheet Drawer Opens with:
    ├── Business Card Header
    ├── Menu Items Grid (4 columns)
    ├── Theme Picker (Appearance)
    ├── Display Size Settings
    ├── Sign Out Button
    └── Scrollable Content Area
```

---

## State Management

### Sheet States
```typescript
const [sheetVisible, setSheetVisible] = useState(false);  // Controls visibility
const [sheetOpen, setSheetOpen] = useState(false);        // Controls animation
const [confirmSignOutVisible, setConfirmSignOutVisible] = useState(false);  // Sign out dialog
```

### Touch Handling
```typescript
const touchStartY = useRef(0);      // Track touch start position
const touchDeltaY = useRef(0);      // Track touch movement delta
const sheetRef = useRef<HTMLDivElement>(null);  // Sheet DOM reference
const scrollRef = useRef<HTMLDivElement>(null); // Scrollable content reference
```

---

## What Appears After Tapping "More"

### 1. **Business Card Header** (Top Section)
**Location:** Lines 550-575

**Content:**
- Business initials avatar (e.g., "TS" for Tech Solutions)
- Business name (e.g., "Tech Solutions Pvt Ltd")
- Owner name (e.g., "Rajesh Kumar")
- Close button (X icon)

**Styling:**
- Background: `var(--primary)` (theme-aware primary color)
- Avatar: `var(--primary-foreground)20` background
- Text: `var(--primary-foreground)` color
- Border: `var(--border)` color

**Interaction:**
- Close button triggers `closeMore()` function

---

### 2. **Menu Items Grid** (4 Columns)
**Location:** Lines 577-605

**Menu Items (9 total):**
1. **Items** - Package icon, color: #f59e0b (amber)
   - Path: `/items`
2. **GST Reports** - Receipt icon, color: #10b981 (green)
   - Path: `/reports/gst`
3. **Vyapar Khata** - CreditCard icon, color: #6366f1 (indigo)
   - Path: `/vyapar-khata-new`
4. **Party Ledger** - CreditCard icon, color: #8b5cf6 (purple)
   - Path: `/ledger`
5. **Bank** - Landmark icon, color: #0ea5e9 (cyan)
   - Path: `/bank-accounts`
6. **POS** - ShoppingCart icon, color: #f97316 (orange)
   - Path: `/pos`
7. **Expenses** - Truck icon, color: #e11d48 (rose)
   - Path: `/extra-expenses`
8. **Employees** - UserCog icon, color: #8b5cf6 (purple)
   - Path: `/employees`
9. **Subscription** - BadgeCheck icon, color: #14b8a6 (teal)
   - Path: `/subscription`

**Styling:**
- Grid: 4 columns, responsive gap
- Inactive background: `var(--muted)` (theme-aware)
- Active background: `${item.color}20` (20% opacity of item color)
- Inactive icon color: Black in light themes, `var(--muted-foreground)` in dark themes
- Active icon color: Item's specific color
- Border: `var(--border)` (inactive), `${item.color}40` (active)

**Interaction:**
- Clicking any item calls `goTo(item.path)` which:
  1. Closes the More sheet
  2. Closes FAB menu if open
  3. Navigates to the selected path

---

### 3. **Theme Picker (Appearance Section)**
**Location:** Lines 607-650

**Header:**
- Palette icon (colored based on current theme)
- "Appearance" label
- Current theme badge (e.g., "Dark", "Light")

**Theme Options (6 total):**
1. **Dark** - Moon icon, color: #6366f1 (indigo)
2. **Light** - Sun icon, color: #f59e0b (amber)
3. **Warm** - Flame icon, color: #f97316 (orange)
4. **Ocean** - Waves icon, color: #0ea5e9 (cyan)
5. **Emerald** - Leaf icon, color: #10b981 (green)
6. **Rosewood** - Heart icon, color: #e11d48 (rose)

**Icon Colors:**
- Dark theme: White icons (#ffffff)
- Light themes: Black icons (#000000)

**Styling:**
- Container: `var(--muted)` background, `var(--border)` border
- Active theme: `${opt.color}18` background, `2px solid ${opt.color}` outline
- Inactive theme: Transparent background, transparent outline
- Active theme circle: Glow effect `0 0 12px ${opt.color}80`

**Interaction:**
- Clicking any theme calls `setTheme(opt.id)` which:
  1. Updates theme context
  2. Applies theme class to document root
  3. Updates all CSS variables
  4. Instantly changes app appearance

---

### 4. **Display Size Settings**
**Location:** Lines 652-680

**Header:**
- Settings icon (SVG with circle and lines)
- "Display Size" label

**Options (3 total):**
1. **Compact** - Font size: 0.85rem
2. **Medium** - Font size: 1.08rem (default)
3. **Large** - Font size: 1.38rem

**Styling:**
- Container: `var(--muted)` background, `var(--border)` border
- Active button: `var(--primary)30` background, `var(--primary)` border
- Inactive button: `var(--muted)` background, `var(--border)` border
- Active text: `var(--primary)` color
- Inactive text: `var(--foreground)` (main text), `var(--muted-foreground)` (label)

**Interaction:**
- Clicking any size calls `setScale(opt.id)` which:
  1. Updates display scale context
  2. Changes font sizes across the app
  3. Adjusts spacing and layout

---

### 5. **Sign Out Button**
**Location:** Lines 682-695

**Content:**
- LogOut icon (red/destructive color)
- "Sign Out" label
- ChevronRight arrow

**Styling:**
- Background: `rgba(239,68,68,0.08)` (light red)
- Border: `1px solid rgba(239,68,68,0.15)` (red border)
- Icon color: `var(--destructive)` (red)
- Text color: `var(--destructive)` (red)

**Interaction:**
- Clicking triggers `setConfirmSignOutVisible(true)` which:
  1. Opens sign out confirmation dialog
  2. Shows warning message
  3. Provides Cancel and Sign Out buttons

---

## Touch Interactions

### Drag to Close
**Location:** Lines 155-180

**Behavior:**
- User can drag the sheet down to close it
- Drag threshold: 70px
- Smooth animation with easing

**Functions:**
- `onSheetTouchStart()` - Records initial touch position
- `onSheetTouchMove()` - Tracks drag movement, updates transform
- `onSheetTouchEnd()` - Closes sheet if dragged > 70px

### Scroll Behavior
- Sheet content is scrollable
- Drag-to-close only works when scrolled to top
- Smooth scrolling with momentum

---

## Animation Details

### Sheet Opening
```typescript
transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)'
transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)'
```
- Slides up from bottom
- Cubic-bezier easing for smooth motion
- 350ms duration

### Backdrop
```typescript
background: sheetOpen ? MOBILE_TOKENS.colors.overlay : 'rgba(0,0,0,0)'
backdropFilter: sheetOpen ? 'blur(4px)' : 'none'
transition: 'background 0.35s ease, backdrop-filter 0.35s ease'
```
- Fades in dark overlay
- Applies blur effect
- Synchronized with sheet animation

---

## Close Mechanisms

### 1. **Close Button**
- X button in business card header
- Calls `closeMore()`

### 2. **Backdrop Click**
- Clicking outside the sheet (on overlay)
- Calls `closeMore()`

### 3. **Drag Down**
- Dragging sheet down > 70px
- Calls `closeMore()`

### 4. **Menu Item Click**
- Clicking any menu item
- Calls `goTo()` which calls `closeMore()`

### 5. **Back Button (Android)**
- Hardware back button
- Closes sheet if open (Step 2 in back handler)

### Close Function
```typescript
const closeMore = useCallback(() => {
  setSheetOpen(false);
  setTimeout(() => setSheetVisible(false), 370);
}, []);
```
- Animates out (350ms)
- Removes from DOM after animation (370ms timeout)

---

## Sign Out Flow

### Step 1: Tap Sign Out Button
- Opens confirmation dialog
- Shows warning message
- Provides Cancel and Sign Out buttons

### Step 2: Confirmation Dialog
**Location:** Lines 700-745

**Content:**
- LogOut icon
- "Sign Out?" heading
- Warning message: "You'll need to sign in again to access your account."
- Cancel button
- Sign Out button

**Styling:**
- Background: `MOBILE_TOKENS.colors.surface`
- Overlay: `rgba(0,0,0,0.65)` with blur
- Buttons: Cancel (muted), Sign Out (error/red)

### Step 3: Confirm Sign Out
- Calls `signOut()` from AuthContext
- Clears authentication
- Redirects to login page

---

## Subscription Expired Overlay

**Location:** Lines 747-800

**Conditions:**
- Only shows if `subscriptionExpired === true`
- Doesn't show on: `/subscription`, `/dashboard`, `/welcome`, `/profiles`

**Content:**
- AlertCircle icon
- "Subscription Expired" heading
- "Renew to continue using BillVyapar." message
- Days remaining (if available)
- "Renew Now" button
- "Sign Out" button

**Styling:**
- Background: `MOBILE_TOKENS.colors.surface`
- Overlay: `rgba(0,0,0,0.7)` with blur
- Buttons: Renew (primary), Sign Out (muted)

---

## Back Button Handling

**Location:** Lines 265-300

**Priority Order:**
1. **Blur focused input** - If keyboard is open, blur it first
2. **Close sign out dialog** - If confirmation visible, close it
3. **Close More sheet** - If sheet is open, close it
4. **Close FAB menu** - If FAB menu is open, close it
5. **Close overlays** - If any dialog/overlay is open, dispatch Escape key
6. **Smart exit** - If on root page, show "Press back again to exit" toast
7. **Navigate back** - Otherwise navigate to previous page

---

## Summary

The "More" button opens a comprehensive settings and navigation drawer that includes:
- Quick access to 9 additional menu items
- Theme customization with 6 themes and visual icons
- Display size adjustment (3 options)
- Sign out functionality with confirmation
- Smooth animations and touch interactions
- Responsive design with proper spacing and colors
- Theme-aware styling throughout

All interactions are smooth, animated, and follow mobile UX best practices.
