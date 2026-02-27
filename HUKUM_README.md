# BillVyapar - Complete Business Documentation & Billing Ecosystem

## 🎉 Overview

**BillVyapar** is a comprehensive web-based business documentation and billing system designed for small to medium businesses. It provides a complete ecosystem for managing invoices, quotations, orders, customers, items, and analytics with GST compliance.

## ✨ Key Features

### 🔐 Authentication & Security
- **Email/Password Authentication** - Secure sign up and sign in
- **Single-Device Login Enforcement** - Enhanced security with session tracking
- **Auto-generated 30-day Trial** - New users get a free trial subscription
- **Subscription Management** - Monthly and yearly plans with automatic expiry

### 🏢 Business Profile Management
- **Multiple Business Profiles** - Netflix-style profile switching under one account
- **Comprehensive Business Information**:
  - Business name, owner name
  - GSTIN, PAN numbers
  - Billing and shipping addresses
  - Phone, email
  - Bank details (Account Number, IFSC Code)
  - UPI ID for digital payments
  - Custom fields support

### 📄 Document Management
- **5 Document Types**:
  - Quotations
  - Invoices
  - Orders
  - Proforma Invoices
  - Delivery Challans

- **Advanced Features**:
  - Auto-generated document numbers (e.g., INV-00001)
  - Editable item lists with full GST calculations
  - Document duplication
  - Version tracking
  - Document conversion (Quote → Invoice, Order → Invoice, etc.)
  - Draft and Final status
  - Payment tracking (Paid/Unpaid)
  - Notes and Terms & Conditions

### 🧾 Item List Management
Each document supports fully editable items with:
- Product/Service name
- HSN/SAC codes
- Quantity and unit (pcs, kg, ltr, hrs, box, etc.)
- Rate per unit
- Discount percentage
- CGST, SGST, IGST percentages
- Automatic total calculation
- Transport charges
- Additional charges
- Round-off adjustments

### 👥 Customer Management
- Unlimited customer database
- Full customer details (name, email, phone, address)
- GSTIN and PAN tracking
- Search and filter capabilities

### 📦 Item Catalog
- Unlimited products/services
- HSN/SAC codes
- Default pricing and tax rates
- Reusable item templates
- Search and filter

### 📊 Analytics Dashboard
- **Real-time Metrics**:
  - Total sales (all time)
  - Outstanding payments
  - Invoice count (paid/unpaid)
  - Quotation conversion rate
  
- **Visual Analytics**:
  - Monthly revenue trends (Line chart)
  - Top-selling items (Pie chart)
  - Top items by revenue and quantity
  - Monthly and yearly summaries
  - GST breakdowns (CGST, SGST, IGST)

### 💳 Subscription System
- **Plans**:
  - Monthly: ₹499/month
  - Yearly: ₹4,999/year (Save 17%)
  
- **Subscription Logic**:
  - Starts from exact purchase date
  - 30-day trial for new users
  - Data remains accessible after expiry
  - Document creation/editing locked until renewal
  - View-only mode for expired subscriptions

### ☁️ Offline-First Architecture
- Full offline functionality
- Create, edit, and view documents without internet
- Automatic cloud sync when online
- Data persistence using Supabase backend

## 🚀 Getting Started

### Demo Account
Use these credentials to explore the application:

```
Email: demo@billvyapar.app
Password: demo123
```

The demo account includes:
- 1 Business profile (Tech Solutions Pvt Ltd)
- 3 Customers
- 5 Items/Services
- 5 Sample documents (Quotation, Invoices, Order, Proforma)
- Pre-populated analytics

### Creating a New Account
1. Click "Sign Up" on the landing page
2. Enter your name, email, and password
3. Get a 30-day free trial automatically
4. Create your first business profile
5. Start adding customers and items

### Quick Workflow
1. **Set Up**:
   - Create business profile(s)
   - Add customers to your database
   - Add items to your catalog

2. **Create Documents**:
   - Choose document type (Invoice, Quotation, etc.)
   - Select/enter customer details
   - Add items from catalog or create new ones
   - Automatic GST calculations
   - Save as draft or finalize

3. **Track & Analyze**:
   - Mark invoices as paid/unpaid
   - View analytics dashboard
   - Track outstanding payments
   - Monitor conversion rates

4. **Convert & Duplicate**:
   - Convert quotations to invoices
   - Duplicate existing documents
   - Track document versions

## 🏗️ Technical Architecture

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS v4** for styling
- **Shadcn/ui** component library
- **Recharts** for analytics visualization
- **Sonner** for toast notifications
- **Motion** for animations

### Backend
- **Supabase** for:
  - Authentication (email/password)
  - Database (KV store)
  - Cloud storage
  - Edge Functions

- **Hono** web server running on Deno
- RESTful API architecture

### Data Storage
All data is stored in Supabase KV store with the following structure:
- `profile:{id}` - Business profiles
- `user-profiles:{userId}` - User's profile list
- `document:{id}` - Documents
- `user-documents:{userId}` - User's document list
- `customer:{id}` - Customers
- `item:{id}` - Items
- `subscription:{userId}` - Subscription data
- `session:{userId}` - Active sessions
- `doc-counter:{userId}:{type}` - Document numbering

### API Endpoints

**Authentication**
- `POST /auth/signup` - Create new account
- `POST /auth/signin` - Sign in
- `POST /auth/verify-session` - Verify active session

**Profiles**
- `GET /profiles` - Get all profiles
- `POST /profiles` - Create profile
- `PUT /profiles/:id` - Update profile

**Documents**
- `GET /documents` - Get all documents
- `POST /documents` - Create document
- `PUT /documents/:id` - Update document
- `POST /documents/:id/duplicate` - Duplicate document
- `POST /documents/:id/convert` - Convert document type

**Customers**
- `GET /customers` - Get all customers
- `POST /customers` - Create customer

**Items**
- `GET /items` - Get all items
- `POST /items` - Create item

**Analytics**
- `GET /analytics` - Get analytics data

**Subscription**
- `GET /subscription` - Get subscription status
- `POST /subscription/update` - Update subscription

## 📱 Features in Detail

### Document Creation Flow
1. Select document type
2. Enter customer details (autocomplete from database)
3. Add items:
   - Search existing items OR
   - Create new items on-the-fly
4. System automatically calculates:
   - Item subtotals
   - GST amounts (CGST, SGST, IGST)
   - Transport charges
   - Additional charges
   - Round-off
   - Grand total
5. Add notes and terms
6. Save as draft or mark as final
7. Track payment status

### GST Calculation Logic
```
Item Subtotal = Quantity × Rate
Discount Amount = Subtotal × (Discount % / 100)
Taxable Amount = Subtotal - Discount Amount
CGST Amount = Taxable Amount × (CGST % / 100)
SGST Amount = Taxable Amount × (SGST % / 100)
IGST Amount = Taxable Amount × (IGST % / 100)
Item Total = Taxable Amount + CGST + SGST + IGST
```

### Document Conversion
- **Quotation → Invoice**: When customer accepts quote
- **Order → Invoice**: When order is fulfilled
- **Invoice → Proforma/Challan**: For different use cases
- Maintains all item details and calculations
- Generates new document number
- Tracks conversion history

## 🎨 User Interface

### Color Scheme
- Primary: Blue (#3b82f6)
- Secondary: Purple (#8b5cf6)
- Success: Green (#10b981)
- Warning: Orange/Yellow (#f59e0b)
- Danger: Red (#ef4444)

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Hamburger menu for mobile navigation
- Touch-friendly buttons and inputs

### Document Type Colors
- **Quotation**: Purple
- **Invoice**: Blue
- **Order**: Green
- **Proforma**: Orange
- **Challan**: Gray

## 📊 Sample Data

The demo account includes realistic Indian business data:

**Business**: Tech Solutions Pvt Ltd (IT Services)
**Customers**: 
- Acme Corporation
- Global Traders Ltd
- Metro Enterprises

**Services**:
- Web Development (₹2,500/hr)
- Mobile App Development (₹3,000/hr)
- Cloud Hosting (₹5,000/month)
- SEO Optimization (₹15,000/month)
- Digital Marketing Campaign (₹25,000/project)

**Sample Documents**:
- Quotation for ₹2,31,500
- Paid Invoice for ₹4,28,700
- Unpaid Invoice for ₹65,000
- Order for ₹1,18,500
- Proforma for ₹60,100

## 🔒 Security Features

1. **Single-Device Login**: Only one active session per user
2. **Session Verification**: Checks device ID on each request
3. **Secure Authentication**: Supabase Auth with bcrypt password hashing
4. **Protected Routes**: Frontend route guards
5. **API Authorization**: Bearer token verification on all endpoints

## 🌐 Offline Capabilities

- **Service Worker Ready**: Can be enhanced for full PWA
- **Local Storage**: User session and profile data
- **Optimistic UI**: Immediate feedback on actions
- **Auto-sync**: Background sync when connection available

## ⚙️ Environment Variables

The application uses Supabase environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side key (never exposed to frontend)

## 🚧 Future Enhancements

Potential features for production version:
- [ ] PDF generation and export
- [ ] Email document sharing
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] WhatsApp integration
- [ ] Automated payment reminders
- [ ] Invoice templates
- [ ] Barcode/QR code scanning
- [ ] Inventory management
- [ ] Expense tracking
- [ ] Tax filing assistance
- [ ] Multi-currency support

## 📄 License

This is a demonstration project built with Figma Make.

## 💡 Notes

- This is a **web application**, not a Windows desktop .exe
- Designed for modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Supabase backend connection
- Not designed for production use with real financial data
- Demo version - payment processing is simulated

## 🤝 Support

For demo and testing purposes:
- Email: demo@billvyapar.app
- Password: demo123

---

**Built with ❤️ using React, Supabase, and Tailwind CSS**
