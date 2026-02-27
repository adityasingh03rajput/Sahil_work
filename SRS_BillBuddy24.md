# Software Requirements Specification (SRS)
## BillBuddy24 - Business Billing & Document Management System

**Version:** 1.0  
**Date:** February 25, 2026  
**Prepared by:** Aditya Singh Rajput  
**Status:** Draft

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | February 25, 2026 | Aditya Singh Rajput | Initial SRS document |
| 1.1 | February 25, 2026 | Aditya Singh Rajput | Updated address requirements (Business Profile single address; Customer billing/shipping addresses with city/state/postal), added PIN-code autofill requirement, updated document date labels (Valid From/Valid To), and added password history reuse prevention on reset |

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Conventions
   - 1.3 Intended Audience
   - 1.4 Product Scope
   - 1.5 References
2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective
   - 2.2 Product Functions
   - 2.3 User Classes and Characteristics
   - 2.4 Operating Environment
   - 2.5 Design and Implementation Constraints
   - 2.6 Assumptions and Dependencies
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [Appendices](#7-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a complete description of BillBuddy24, a comprehensive web-based business billing and document management system. This document is intended for:

- Development team members
- Quality assurance and testing teams
- Project stakeholders
- System administrators
- Future maintainers

### 1.2 Document Conventions


- **SHALL/MUST**: Indicates mandatory requirements
- **SHOULD**: Indicates recommended requirements
- **MAY**: Indicates optional requirements
- **Priority Levels**: High (Critical), Medium (Important), Low (Enhancement)
- **REQ-XXX**: Requirement identifier format

### 1.3 Intended Audience

This document is designed for:

- **Developers**: Implementation guidance and technical specifications
- **QA Engineers**: Test case development and validation criteria
- **Project Managers**: Scope definition and milestone tracking
- **Business Stakeholders**: Feature understanding and acceptance criteria
- **System Administrators**: Deployment and maintenance requirements

### 1.4 Product Scope

BillBuddy24 is a comprehensive business billing and document management system designed for small to medium-sized businesses in India. The system provides:

**Primary Objectives:**
- Streamline invoice and quotation creation
- Ensure GST compliance and accurate tax calculations
- Manage customer and supplier relationships
- Track payments and outstanding amounts
- Generate business analytics and reports
- Support offline operations with cloud synchronization

**Key Benefits:**
- Reduce manual billing effort by 70%
- Eliminate calculation errors with automated GST computation
- Improve cash flow visibility with payment tracking
- Enable data-driven decisions through analytics
- Ensure business continuity with offline mode

**Out of Scope:**
- Inventory management and stock tracking
- Payroll and employee management
- Manufacturing or production planning
- E-commerce integration
- Multi-currency real-time exchange rates

### 1.5 References

- GST (Goods and Services Tax) Act, India
- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications
- MongoDB Documentation v8.x
- React Documentation v18.x
- Express.js Documentation v4.x
- JWT (JSON Web Token) RFC 7519

---

## 2. Overall Description

### 2.1 Product Perspective

BillBuddy24 is a standalone web-based application with the following system context:


**System Architecture:**
- Client-Server architecture with RESTful API
- Single Page Application (SPA) frontend
- MongoDB database for data persistence
- JWT-based authentication and authorization
- Offline-first design with cloud synchronization

**System Interfaces:**
- Web browser interface (Chrome, Firefox, Safari, Edge)
- RESTful API for frontend-backend communication
- MongoDB database interface
- SMS gateway (Twilio) for OTP delivery
- PDF generation engine for document export

**Hardware Interfaces:**
- Standard web server hardware
- Client devices: Desktop, laptop, tablet
- Minimum 2GB RAM, dual-core processor recommended

**Software Interfaces:**
- Operating System: Windows, macOS, Linux (browser-based)
- Database: MongoDB v8.x or higher
- Node.js Runtime: v18.x or higher
- Modern web browsers with ES6+ support

**Communication Interfaces:**
- HTTPS/HTTP protocols for API communication
- WebSocket support for real-time updates (future)
- RESTful JSON API
- SMS API for OTP delivery

### 2.2 Product Functions

BillBuddy24 provides the following major functions:

1. **User Management**
   - User registration and authentication
   - Single-device session enforcement
   - Password reset via OTP
   - Profile management

2. **Subscription Management**
   - Trial period (30 days)
   - Monthly and yearly subscription plans
   - Online and offline subscription validation
   - Payment tracking and renewal

3. **Business Profile Management**
   - Multiple business profiles per user
   - Complete business information management
   - GST and PAN details
   - Bank and UPI payment information

4. **Document Management**
   - Create invoices, quotations, orders, proforma invoices, delivery challans
   - Auto-generated document numbers
   - Document versioning and tracking
   - Document conversion (e.g., quotation to invoice)
   - Draft and final status management


5. **Customer & Supplier Management**
   - Customer and supplier catalog
   - Contact information management
   - GST and PAN tracking
   - Quick search and autocomplete

6. **Item Catalog Management**
   - Product and service catalog
   - HSN/SAC code management
   - Default pricing and tax rates
   - Reusable item templates

7. **GST Calculations**
   - Automatic CGST, SGST, IGST calculations
   - Item-level tax rates
   - Discount calculations
   - Round-off adjustments

8. **Payment Tracking**
   - Record payments against invoices
   - Payment method tracking
   - Outstanding amount calculations
   - Payment status updates

9. **Analytics & Reporting**
   - Sales analytics dashboard
   - Top-selling items reports
   - Monthly revenue trends
   - GST reports with HSN/SAC summary
   - Outstanding payments tracking

10. **PDF Export**
    - Multiple document templates
    - Professional invoice layouts
    - QR code generation for UPI payments
    - Print-ready PDF generation

11. **Offline Mode**
    - Cached subscription validation
    - Local data access
    - Time-tamper detection
    - Automatic sync when online

### 2.3 User Classes and Characteristics

**Primary Users:**

1. **Business Owner / Administrator**
   - Technical Expertise: Basic to Intermediate
   - Frequency of Use: Daily
   - Functions: All system features
   - Priority: High

2. **Accountant / Bookkeeper**
   - Technical Expertise: Basic
   - Frequency of Use: Daily
   - Functions: Document creation, payment tracking, reports
   - Priority: High

3. **Sales Staff**
   - Technical Expertise: Basic
   - Frequency of Use: Regular
   - Functions: Quotation and invoice creation
   - Priority: Medium


### 2.4 Operating Environment

**Client Environment:**
- Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Screen resolution: Minimum 1024x768, Recommended 1920x1080
- Internet connection: Required for initial setup and sync
- JavaScript enabled
- Cookies and LocalStorage enabled

**Server Environment:**
- Node.js v18.x or higher
- MongoDB v8.x or higher
- Linux/Windows Server
- Minimum 2GB RAM, 4GB recommended
- 10GB storage minimum
- HTTPS/SSL certificate for production

**Network Requirements:**
- Bandwidth: Minimum 1 Mbps
- Latency: < 200ms recommended
- Firewall: Ports 80, 443 open

### 2.5 Design and Implementation Constraints

**Technology Constraints:**
- Frontend: React 18 with TypeScript
- Backend: Node.js with Express framework
- Database: MongoDB (NoSQL)
- Authentication: JWT (JSON Web Tokens)
- PDF Generation: html2canvas + jsPDF

**Regulatory Constraints:**
- Must comply with GST regulations in India
- Must maintain audit trails for financial documents
- Data retention as per Indian tax laws (6 years minimum)

**Security Constraints:**
- Single-device login enforcement
- Password complexity requirements
- Session timeout after inactivity
- Encrypted data transmission (HTTPS)
- Secure password storage (bcrypt hashing)

**Performance Constraints:**
- Page load time: < 3 seconds
- API response time: < 500ms for 95% of requests
- Support for 100+ concurrent users
- Database queries: < 100ms for standard operations

**Business Constraints:**
- Subscription-based access model
- Offline access limited to 7 days
- Trial period: 30 days
- Document number auto-increment per profile


### 2.6 Assumptions and Dependencies

**Assumptions:**
- Users have basic computer literacy
- Users have access to stable internet connection periodically
- Users understand basic GST concepts
- Business operates within Indian tax jurisdiction
- Users use modern web browsers
- Mobile devices have minimum 4GB RAM for optimal performance

**Dependencies:**
- MongoDB database availability
- Node.js runtime environment
- Third-party libraries (React, Express, Mongoose)
- Twilio SMS service for OTP delivery
- SSL certificate provider
- Cloud hosting provider (if deployed on cloud)
- Browser support for modern JavaScript features

---

## 3. System Features

### 3.1 User Authentication and Authorization

**Priority:** High  
**Description:** Secure user registration, login, and session management with single-device enforcement.

**Functional Requirements:**

**REQ-AUTH-001:** System SHALL allow users to register with email, password, name, and phone number  
**REQ-AUTH-002:** System SHALL validate email format and uniqueness during registration  
**REQ-AUTH-003:** System SHALL enforce password minimum length of 6 characters  
**REQ-AUTH-004:** System SHALL hash passwords using bcrypt before storage  
**REQ-AUTH-005:** System SHALL generate JWT tokens with 7-day expiry on successful login  
**REQ-AUTH-006:** System SHALL enforce single-device session per user account  
**REQ-AUTH-007:** System SHALL track device ID via X-Device-ID header  
**REQ-AUTH-008:** System SHALL invalidate previous session when user logs in from new device  
**REQ-AUTH-009:** System SHALL provide password reset via OTP sent to registered phone  
**REQ-AUTH-010:** System SHALL generate 4-digit OTP valid for 10 minutes  
**REQ-AUTH-011:** System SHALL limit OTP verification attempts to 5 per request  
**REQ-AUTH-012:** System SHALL verify active session on each protected API request  
**REQ-AUTH-013:** System SHALL return 401 Unauthorized for invalid/expired tokens  
**REQ-AUTH-014:** System SHALL return 403 Forbidden for device mismatch  
**REQ-AUTH-015:** System SHALL provide sign-out functionality to clear session  
**REQ-AUTH-016:** System SHALL prevent users from reusing any previously used password during password reset (password history enforcement)  
**REQ-AUTH-017:** System SHOULD limit stored password history to a configurable maximum number of previous passwords


### 3.2 Subscription Management

**Priority:** High  
**Description:** Manage user subscriptions with online and offline validation capabilities.

**Functional Requirements:**

**REQ-SUB-001:** System SHALL automatically create 30-day trial subscription on user registration  
**REQ-SUB-002:** System SHALL offer Monthly plan at ₹499/month  
**REQ-SUB-003:** System SHALL offer Yearly plan at ₹4,999/year  
**REQ-SUB-004:** System SHALL calculate subscription end date from purchase date  
**REQ-SUB-005:** System SHALL generate signed subscription tokens using RS256 algorithm  
**REQ-SUB-006:** System SHALL include userId, profileId, plan, endDate in subscription token  
**REQ-SUB-007:** System SHALL cache subscription tokens in browser localStorage  
**REQ-SUB-008:** System SHALL validate subscription online via API call  
**REQ-SUB-009:** System SHALL validate subscription offline using cached token  
**REQ-SUB-010:** System SHALL verify token signature offline using public key  
**REQ-SUB-011:** System SHALL detect device time rollback attempts  
**REQ-SUB-012:** System SHALL enforce maximum offline duration of 7 days  
**REQ-SUB-013:** System SHALL block access when subscription expires  
**REQ-SUB-014:** System SHALL allow read-only access to expired subscriptions  
**REQ-SUB-015:** System SHALL prevent document creation/editing for expired subscriptions  
**REQ-SUB-016:** System SHALL display subscription status on dashboard  
**REQ-SUB-017:** System SHALL show days remaining until expiry  
**REQ-SUB-018:** System SHALL allow subscription renewal before expiry  
**REQ-SUB-019:** System SHALL extend subscription from current end date if active  
**REQ-SUB-020:** System SHALL track previous subscription plan

### 3.3 Business Profile Management

**Priority:** High  
**Description:** Create and manage multiple business profiles with complete business information.

**Functional Requirements:**

**REQ-PROF-001:** System SHALL allow users to create multiple business profiles  
**REQ-PROF-002:** System SHALL require business name and owner name for profile creation  
**REQ-PROF-003:** System SHALL store GSTIN (GST Identification Number)  
**REQ-PROF-004:** System SHALL store PAN (Permanent Account Number)  
**REQ-PROF-005:** System SHALL store business email and phone number  
**REQ-PROF-006:** System SHALL store a single business address (UI) and persist it as billingAddress and shippingAddress in the data model for compatibility  
**REQ-PROF-006a:** System SHALL store business address metadata including city, state, and postal code  
**REQ-PROF-006b:** System SHOULD provide an India state dropdown for selecting business state
**REQ-PROF-007:** System SHALL store bank details (name, branch, account number, IFSC)  
**REQ-PROF-008:** System SHALL store UPI ID for digital payments  
**REQ-PROF-009:** System SHALL support custom fields for additional information  
**REQ-PROF-010:** System SHALL allow editing profile information  
**REQ-PROF-011:** System SHALL isolate all data by profile ID  
**REQ-PROF-012:** System SHALL require X-Profile-ID header for profile-scoped operations  
**REQ-PROF-013:** System SHALL validate profile ownership before operations  
**REQ-PROF-014:** System SHALL provide profile migration for legacy data  
**REQ-PROF-015:** System SHALL display profile list for selection


### 3.4 Document Management

**Priority:** High  
**Description:** Create, edit, and manage various business documents with version control.

**Functional Requirements:**

**REQ-DOC-001:** System SHALL support document types: Invoice, Quotation, Proforma, Order, Delivery Challan, Billing, Purchase  
**REQ-DOC-002:** System SHALL auto-generate unique document numbers per type per profile  
**REQ-DOC-003:** System SHALL format document numbers as TYPE-00001 (e.g., INVOICE-00001)  
**REQ-DOC-004:** System SHALL increment document counter for each new document  
**REQ-DOC-005:** System SHALL store customer/supplier name, address, and GSTIN  
**REQ-DOC-006:** System SHALL store document date and due date (UI labels: Valid From and Valid To)  
**REQ-DOC-007:** System SHALL store invoice number, challan number, e-way bill number  
**REQ-DOC-008:** System SHALL store transport details and place of supply  
**REQ-DOC-009:** System SHALL store bank and UPI payment details  
**REQ-DOC-010:** System SHALL support multiple items per document  
**REQ-DOC-011:** System SHALL store item name, HSN/SAC code, quantity, unit, rate  
**REQ-DOC-012:** System SHALL support per-item currency (INR, USD, EUR, GBP)  
**REQ-DOC-013:** System SHALL calculate item discount amount from percentage  
**REQ-DOC-014:** System SHALL calculate CGST, SGST, IGST per item  
**REQ-DOC-015:** System SHALL calculate item total including taxes  
**REQ-DOC-016:** System SHALL calculate document subtotal from all items  
**REQ-DOC-017:** System SHALL add transport charges to subtotal  
**REQ-DOC-018:** System SHALL add additional charges to subtotal  
**REQ-DOC-019:** System SHALL apply round-off adjustment  
**REQ-DOC-020:** System SHALL support auto round-off to nearest whole number  
**REQ-DOC-021:** System SHALL calculate grand total  
**REQ-DOC-022:** System SHALL store notes and terms & conditions  
**REQ-DOC-023:** System SHALL track payment status (unpaid, partial, paid)  
**REQ-DOC-024:** System SHALL track payment mode (cash, cheque, online)  
**REQ-DOC-025:** System SHALL track document status (draft, final)  
**REQ-DOC-026:** System SHALL increment version number on each edit  
**REQ-DOC-027:** System SHALL allow document duplication  
**REQ-DOC-028:** System SHALL allow document conversion between types  
**REQ-DOC-029:** System SHALL track source document ID for conversions  
**REQ-DOC-030:** System SHALL list all documents sorted by creation date  
**REQ-DOC-031:** System SHALL allow document retrieval by ID  
**REQ-DOC-032:** System SHALL allow document editing  
**REQ-DOC-033:** System SHALL prevent document deletion (audit trail)  
**REQ-DOC-034:** System SHALL require active subscription for document creation/editing  
**REQ-DOC-035:** System SHALL allow read-only access for expired subscriptions


### 3.5 Customer and Supplier Management

**Priority:** High  
**Description:** Maintain catalogs of customers and suppliers with contact and tax information.

**Functional Requirements:**

**REQ-CUST-001:** System SHALL allow creating customer records per profile  
**REQ-CUST-002:** System SHALL require customer name  
**REQ-CUST-003:** System SHALL store customer email and phone (optional)  
**REQ-CUST-003a:** System SHALL store customer billing address (text) with billing city, billing state, and billing postal code  
**REQ-CUST-003b:** System SHALL store customer shipping address (text) with shipping city, shipping state, and shipping postal code  
**REQ-CUST-003c:** System MAY auto-detect city and state from Indian PIN code when the user enters a 6-digit pincode in address or postal code fields
**REQ-CUST-004:** System SHALL store customer GSTIN and PAN  
**REQ-CUST-005:** System SHALL allow editing customer information  
**REQ-CUST-006:** System SHALL list all customers for a profile  
**REQ-CUST-007:** System SHALL provide customer search/autocomplete  
**REQ-CUST-008:** System SHALL auto-fill document fields from selected customer  
**REQ-CUST-009:** System SHALL allow creating supplier records per profile  
**REQ-CUST-010:** System SHALL require supplier name  
**REQ-CUST-011:** System SHALL store supplier email, phone, and address (optional)  
**REQ-CUST-012:** System SHALL store supplier GSTIN and PAN  
**REQ-CUST-013:** System SHALL store supplier bank and UPI details  
**REQ-CUST-014:** System SHALL allow editing supplier information  
**REQ-CUST-015:** System SHALL list all suppliers for a profile  
**REQ-CUST-016:** System SHALL provide supplier search/autocomplete  
**REQ-CUST-017:** System SHALL require active subscription for customer/supplier creation

### 3.6 Item Catalog Management

**Priority:** High  
**Description:** Maintain catalog of products and services with pricing and tax information.

**Functional Requirements:**

**REQ-ITEM-001:** System SHALL allow creating item records per profile  
**REQ-ITEM-002:** System SHALL require item name, unit, and rate  
**REQ-ITEM-003:** System SHALL store HSN/SAC code  
**REQ-ITEM-004:** System SHALL store default discount percentage  
**REQ-ITEM-005:** System SHALL store CGST, SGST, IGST percentages  
**REQ-ITEM-006:** System SHALL store item description  
**REQ-ITEM-007:** System SHALL list all items for a profile  
**REQ-ITEM-008:** System SHALL provide item search/autocomplete  
**REQ-ITEM-009:** System SHALL auto-fill document item rows from selected item  
**REQ-ITEM-010:** System SHALL require active subscription for item creation


### 3.7 Payment Tracking

**Priority:** Medium  
**Description:** Record and track payments against invoices and customers.

**Functional Requirements:**

**REQ-PAY-001:** System SHALL allow recording payments per profile  
**REQ-PAY-002:** System SHALL require payment amount, date, and currency  
**REQ-PAY-003:** System SHALL link payments to documents (optional)  
**REQ-PAY-004:** System SHALL link payments to customers (optional)  
**REQ-PAY-005:** System SHALL store payment method (cash, cheque, online)  
**REQ-PAY-006:** System SHALL store payment reference number  
**REQ-PAY-007:** System SHALL store payment notes  
**REQ-PAY-008:** System SHALL calculate total paid amount per document  
**REQ-PAY-009:** System SHALL calculate remaining amount per document  
**REQ-PAY-010:** System SHALL update document payment status automatically  
**REQ-PAY-011:** System SHALL set status to 'paid' when fully paid  
**REQ-PAY-012:** System SHALL set status to 'partial' when partially paid  
**REQ-PAY-013:** System SHALL set status to 'unpaid' when no payment  
**REQ-PAY-014:** System SHALL list payments by document  
**REQ-PAY-015:** System SHALL list payments by customer  
**REQ-PAY-016:** System SHALL calculate total outstanding across all invoices  
**REQ-PAY-017:** System SHALL require active subscription for payment recording

### 3.8 Analytics and Reporting

**Priority:** Medium  
**Description:** Provide business insights through analytics dashboard and reports.

**Functional Requirements:**

**REQ-ANAL-001:** System SHALL calculate total sales from all invoices  
**REQ-ANAL-002:** System SHALL calculate total outstanding from unpaid invoices  
**REQ-ANAL-003:** System SHALL count total invoices (paid and unpaid)  
**REQ-ANAL-004:** System SHALL count total quotations  
**REQ-ANAL-005:** System SHALL calculate quotation to invoice conversion rate  
**REQ-ANAL-006:** System SHALL identify top 5 items by revenue  
**REQ-ANAL-007:** System SHALL calculate item quantity sold  
**REQ-ANAL-008:** System SHALL calculate monthly revenue totals  
**REQ-ANAL-009:** System SHALL provide monthly revenue trend chart  
**REQ-ANAL-010:** System SHALL provide top items pie chart  
**REQ-ANAL-011:** System SHALL allow read-only analytics access for expired subscriptions


### 3.9 GST Reporting

**Priority:** Medium  
**Description:** Generate GST compliance reports with HSN/SAC summaries.

**Functional Requirements:**

**REQ-GST-001:** System SHALL generate GST reports for date ranges  
**REQ-GST-002:** System SHALL filter invoices by date range  
**REQ-GST-003:** System SHALL exclude draft invoices from reports  
**REQ-GST-004:** System SHALL calculate total taxable value  
**REQ-GST-005:** System SHALL calculate total CGST amount  
**REQ-GST-006:** System SHALL calculate total SGST amount  
**REQ-GST-007:** System SHALL calculate total IGST amount  
**REQ-GST-008:** System SHALL calculate total tax amount  
**REQ-GST-009:** System SHALL group items by HSN/SAC code  
**REQ-GST-010:** System SHALL calculate taxable value per HSN/SAC  
**REQ-GST-011:** System SHALL calculate tax amounts per HSN/SAC  
**REQ-GST-012:** System SHALL list outward invoices with tax breakdown  
**REQ-GST-013:** System SHALL sort HSN summary by taxable value descending  
**REQ-GST-014:** System SHALL allow read-only GST reports for expired subscriptions

### 3.10 PDF Export

**Priority:** Medium  
**Description:** Export documents as professional PDF files with multiple templates.

**Functional Requirements:**

**REQ-PDF-001:** System SHALL provide Classic template for PDF export  
**REQ-PDF-002:** System SHALL provide Modern template for PDF export  
**REQ-PDF-003:** System SHALL provide Minimal template for PDF export  
**REQ-PDF-004:** System SHALL render business profile information in PDF  
**REQ-PDF-005:** System SHALL render customer information in PDF  
**REQ-PDF-006:** System SHALL render all document items in PDF  
**REQ-PDF-007:** System SHALL render tax calculations in PDF  
**REQ-PDF-008:** System SHALL render totals and grand total in PDF  
**REQ-PDF-009:** System SHALL render notes and terms in PDF  
**REQ-PDF-010:** System SHALL generate QR code for UPI payments  
**REQ-PDF-011:** System SHALL support multi-page PDF generation  
**REQ-PDF-012:** System SHALL normalize Tailwind CSS colors for PDF  
**REQ-PDF-013:** System SHALL use html2canvas for HTML to image conversion  
**REQ-PDF-014:** System SHALL use jsPDF for PDF file generation  
**REQ-PDF-015:** System SHALL name PDF file as DocumentNumber.pdf


### 3.11 Offline Mode

**Priority:** Medium  
**Description:** Support offline operations with cached subscription validation.

**Functional Requirements:**

**REQ-OFF-001:** System SHALL cache subscription tokens in localStorage  
**REQ-OFF-002:** System SHALL store last known device time  
**REQ-OFF-003:** System SHALL detect time rollback by comparing current vs last time  
**REQ-OFF-004:** System SHALL allow 2-minute clock jitter tolerance  
**REQ-OFF-005:** System SHALL verify cached token signature offline  
**REQ-OFF-006:** System SHALL calculate estimated server time from cached token  
**REQ-OFF-007:** System SHALL check subscription expiry using estimated time  
**REQ-OFF-008:** System SHALL enforce maximum offline duration (7 days default)  
**REQ-OFF-009:** System SHALL block access if offline too long  
**REQ-OFF-010:** System SHALL block access if time tampering detected  
**REQ-OFF-011:** System SHALL block access if token signature invalid  
**REQ-OFF-012:** System SHALL block access if profile mismatch  
**REQ-OFF-013:** System SHALL display appropriate error messages for offline failures  
**REQ-OFF-014:** System SHALL prompt user to reconnect to internet  
**REQ-OFF-015:** System SHALL sync subscription status when online

---

## 4. External Interface Requirements

### 4.1 User Interface Requirements

**REQ-UI-001:** System SHALL provide responsive web interface  
**REQ-UI-002:** System SHALL support minimum screen resolution 1024x768  
**REQ-UI-003:** System SHALL use Tailwind CSS for styling  
**REQ-UI-004:** System SHALL use Radix UI components  
**REQ-UI-005:** System SHALL provide navigation sidebar  
**REQ-UI-006:** System SHALL display toast notifications for user feedback  
**REQ-UI-007:** System SHALL show loading indicators during operations  
**REQ-UI-008:** System SHALL validate form inputs with error messages  
**REQ-UI-009:** System SHALL provide autocomplete for customer/item selection  
**REQ-UI-010:** System SHALL display subscription status prominently  
**REQ-UI-011:** System SHALL use color coding for document types  
**REQ-UI-012:** System SHALL provide print-friendly layouts  
**REQ-UI-013:** System SHALL support keyboard navigation  
**REQ-UI-014:** System SHALL provide accessible UI elements


### 4.2 API Interface Requirements

**REQ-API-001:** System SHALL provide RESTful JSON API  
**REQ-API-002:** System SHALL use HTTP methods: GET, POST, PUT, DELETE  
**REQ-API-003:** System SHALL return appropriate HTTP status codes  
**REQ-API-004:** System SHALL require Authorization header with Bearer token  
**REQ-API-005:** System SHALL require X-Device-ID header for authentication  
**REQ-API-006:** System SHALL require X-Profile-ID header for profile operations  
**REQ-API-007:** System SHALL return JSON error responses with error field  
**REQ-API-008:** System SHALL return JSON success responses with data  
**REQ-API-009:** System SHALL support CORS for cross-origin requests  
**REQ-API-010:** System SHALL limit request body size to 2MB  
**REQ-API-011:** System SHALL provide /health endpoint for monitoring  
**REQ-API-012:** System SHALL log API errors for debugging

**API Endpoints:**

**Authentication:**
- POST /auth/signup - User registration
- POST /auth/signin - User login
- POST /auth/verify-session - Session verification
- POST /auth/signout - User logout
- POST /auth/forgot-password - Request password reset OTP
- POST /auth/reset-password - Reset password with OTP

**Profiles:**
- POST /profiles - Create business profile
- GET /profiles - List user's profiles
- PUT /profiles/:id - Update profile
- POST /profiles/:id/migrate-data - Migrate legacy data

**Documents:**
- POST /documents - Create document
- GET /documents - List documents
- GET /documents/:id - Get document by ID
- PUT /documents/:id - Update document
- POST /documents/:id/duplicate - Duplicate document
- POST /documents/:id/convert - Convert document type

**Customers:**
- POST /customers - Create customer
- GET /customers - List customers
- PUT /customers/:id - Update customer

**Suppliers:**
- POST /suppliers - Create supplier
- GET /suppliers - List suppliers
- PUT /suppliers/:id - Update supplier

**Items:**
- POST /items - Create item
- GET /items - List items

**Payments:**
- POST /payments - Record payment
- GET /payments - List payments
- GET /payments/outstanding - Get outstanding amounts

**Subscription:**
- GET /subscription - Get subscription details
- GET /subscription/validate - Validate and get signed token
- POST /subscription/update - Update subscription plan

**Analytics:**
- GET /analytics - Get analytics data

**Reports:**
- GET /reports/gst - Get GST report


### 4.3 Database Interface Requirements

**REQ-DB-001:** System SHALL use MongoDB for data persistence  
**REQ-DB-002:** System SHALL use Mongoose ODM for schema definition  
**REQ-DB-003:** System SHALL create indexes on frequently queried fields  
**REQ-DB-004:** System SHALL store timestamps (createdAt, updatedAt) for all records  
**REQ-DB-005:** System SHALL use ObjectId for primary keys  
**REQ-DB-006:** System SHALL enforce referential integrity via application logic  
**REQ-DB-007:** System SHALL handle database connection errors gracefully  
**REQ-DB-008:** System SHALL implement connection pooling  
**REQ-DB-009:** System SHALL backup database regularly (deployment specific)

### 4.4 External Service Interfaces

**REQ-EXT-001:** System SHALL integrate with Twilio for SMS delivery  
**REQ-EXT-002:** System SHALL send OTP via SMS for password reset  
**REQ-EXT-003:** System SHALL handle SMS delivery failures gracefully  
**REQ-EXT-004:** System SHALL log OTP to console in development mode  
**REQ-EXT-005:** System SHALL validate Twilio configuration before sending SMS

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

**REQ-PERF-001:** System SHALL load pages within 3 seconds on standard broadband  
**REQ-PERF-002:** System SHALL respond to API requests within 500ms for 95% of requests  
**REQ-PERF-003:** System SHALL support 100 concurrent users  
**REQ-PERF-004:** System SHALL execute database queries within 100ms for standard operations  
**REQ-PERF-005:** System SHALL handle 1000 documents per profile efficiently  
**REQ-PERF-006:** System SHALL generate PDF within 5 seconds for standard documents  
**REQ-PERF-007:** System SHALL optimize images and assets for fast loading  
**REQ-PERF-008:** System SHALL implement lazy loading for large lists

### 5.2 Security Requirements

**REQ-SEC-001:** System SHALL use HTTPS for all communications in production  
**REQ-SEC-002:** System SHALL hash passwords using bcrypt with salt rounds ≥ 10  
**REQ-SEC-003:** System SHALL sign JWT tokens with secure secret key  
**REQ-SEC-004:** System SHALL validate JWT tokens on every protected request  
**REQ-SEC-005:** System SHALL implement rate limiting for authentication endpoints  
**REQ-SEC-006:** System SHALL sanitize user inputs to prevent injection attacks  
**REQ-SEC-007:** System SHALL implement CORS policy to restrict origins  
**REQ-SEC-008:** System SHALL store sensitive configuration in environment variables  
**REQ-SEC-009:** System SHALL not expose internal error details to clients  
**REQ-SEC-010:** System SHALL log security events for audit  
**REQ-SEC-011:** System SHALL enforce single-device session per user  
**REQ-SEC-012:** System SHALL use RS256 for subscription token signing  
**REQ-SEC-013:** System SHALL never expose private keys to frontend  
**REQ-SEC-014:** System SHALL validate profile ownership before operations


### 5.3 Reliability Requirements

**REQ-REL-001:** System SHALL have 99% uptime (excluding planned maintenance)  
**REQ-REL-002:** System SHALL handle database connection failures gracefully  
**REQ-REL-003:** System SHALL implement error boundaries in React components  
**REQ-REL-004:** System SHALL log errors for debugging and monitoring  
**REQ-REL-005:** System SHALL provide meaningful error messages to users  
**REQ-REL-006:** System SHALL recover from transient network failures  
**REQ-REL-007:** System SHALL maintain data consistency during failures  
**REQ-REL-008:** System SHALL implement database transaction rollback on errors

### 5.4 Availability Requirements

**REQ-AVAIL-001:** System SHALL be available 24/7 except during maintenance  
**REQ-AVAIL-002:** System SHALL schedule maintenance during low-usage periods  
**REQ-AVAIL-003:** System SHALL notify users of planned maintenance  
**REQ-AVAIL-004:** System SHALL support offline mode for up to 7 days  
**REQ-AVAIL-005:** System SHALL sync data when connection restored

### 5.5 Maintainability Requirements

**REQ-MAINT-001:** System SHALL use modular architecture for easy updates  
**REQ-MAINT-002:** System SHALL follow consistent coding standards  
**REQ-MAINT-003:** System SHALL include inline code comments for complex logic  
**REQ-MAINT-004:** System SHALL use TypeScript for type safety  
**REQ-MAINT-005:** System SHALL separate concerns (routes, models, middleware)  
**REQ-MAINT-006:** System SHALL use environment variables for configuration  
**REQ-MAINT-007:** System SHALL version API endpoints if breaking changes occur  
**REQ-MAINT-008:** System SHALL maintain changelog for releases

### 5.6 Portability Requirements

**REQ-PORT-001:** System SHALL run on Windows, macOS, and Linux servers  
**REQ-PORT-002:** System SHALL work on Chrome, Firefox, Safari, Edge browsers  
**REQ-PORT-003:** System SHALL be deployable on cloud platforms (AWS, Azure, GCP)  
**REQ-PORT-004:** System SHALL use containerization (Docker) for deployment  
**REQ-PORT-005:** System SHALL separate frontend and backend for independent deployment

### 5.7 Usability Requirements

**REQ-USE-001:** System SHALL provide intuitive navigation  
**REQ-USE-002:** System SHALL use consistent UI patterns throughout  
**REQ-USE-003:** System SHALL provide helpful tooltips and labels  
**REQ-USE-004:** System SHALL validate inputs with clear error messages  
**REQ-USE-005:** System SHALL provide autocomplete for faster data entry  
**REQ-USE-006:** System SHALL display loading states during operations  
**REQ-USE-007:** System SHALL provide success/error feedback via toasts  
**REQ-USE-008:** System SHALL support keyboard shortcuts for common actions  
**REQ-USE-009:** System SHALL provide search functionality for large lists  
**REQ-USE-010:** System SHALL remember user preferences (theme, layout)


### 5.8 Scalability Requirements

**REQ-SCALE-001:** System SHALL support horizontal scaling of backend servers  
**REQ-SCALE-002:** System SHALL support database sharding for large datasets  
**REQ-SCALE-003:** System SHALL implement caching for frequently accessed data  
**REQ-SCALE-004:** System SHALL optimize database queries with proper indexing  
**REQ-SCALE-005:** System SHALL paginate large result sets  
**REQ-SCALE-006:** System SHALL support CDN for static asset delivery

### 5.9 Compliance Requirements

**REQ-COMP-001:** System SHALL comply with GST regulations in India  
**REQ-COMP-002:** System SHALL maintain audit trail for financial documents  
**REQ-COMP-003:** System SHALL retain data for minimum 6 years (tax compliance)  
**REQ-COMP-004:** System SHALL provide data export functionality  
**REQ-COMP-005:** System SHALL comply with data privacy regulations  
**REQ-COMP-006:** System SHALL allow users to delete their accounts  
**REQ-COMP-007:** System SHALL provide terms of service and privacy policy

---

## 6. Data Requirements

### 6.1 Data Models

**User Model:**
- email (String, unique, required)
- passwordHash (String, required)
- passwordHistory (Array[String], optional; stores previous password hashes for reuse prevention)
- name (String, optional)
- phone (String, required, E.164 format)
- createdAt, updatedAt (Timestamps)

**Session Model:**
- userId (ObjectId, reference to User)
- deviceId (String, required)
- lastActive (Date)

**Subscription Model:**
- userId (ObjectId, reference to User, unique)
- plan (String: trial/monthly/yearly)
- startDate (Date)
- endDate (Date)
- active (Boolean)
- previousPlan (String, optional)

**BusinessProfile Model:**
- userId (ObjectId, reference to User)
- businessName (String, required)
- ownerName (String, required)
- gstin (String, optional)
- pan (String, optional)
- email (String, required)
- phone (String, required)
- billingAddress (String, optional)
- shippingAddress (String, optional)
- city, state, postalCode (String, optional)
- bankName, bankBranch, accountNumber, ifscCode (String, optional)
- upiId (String, optional)
- customFields (Mixed, optional)


**Document Model:**
- userId (ObjectId, reference to User)
- profileId (ObjectId, reference to BusinessProfile)
- documentNumber (String, required, indexed)
- type (String: invoice/quotation/proforma/order/challan/billing/purchase)
- customerName, customerAddress, customerGstin (String, optional)
- date, dueDate (String, optional; UI labels: Valid From and Valid To)
- invoiceNo, challanNo, ewayBillNo (String, optional)
- transport, transportId, placeOfSupply (String, optional)
- bankName, bankBranch, bankAccountNumber, bankIfsc (String, optional)
- upiId, upiQrText (String, optional)
- items (Array of DocumentItem)
- transportCharges, additionalCharges, roundOff (Number)
- notes, termsConditions (String, optional)
- paymentStatus (String: unpaid/partial/paid)
- paymentMode (String: cash/cheque/online)
- status (String: draft/final)
- currency (String, default: INR)
- itemsTotal, subtotal, grandTotal (Number)
- totalCgst, totalSgst, totalIgst (Number)
- version (Number, default: 1)
- convertedFrom (String, optional)

**DocumentItem Sub-Schema:**
- name (String, required)
- hsnSac (String, optional)
- quantity (Number)
- unit (String, optional)
- rate (Number)
- currency (String, default: INR)
- discount (Number, percentage)
- cgst, sgst, igst (Number, percentage)
- total (Number)

**Customer Model:**
- userId (ObjectId, reference to User)
- profileId (ObjectId, reference to BusinessProfile)
- name (String, required)
- email, phone (String, optional)
- billingAddress (String, optional)
- billingCity, billingState, billingPostalCode (String, optional)
- shippingAddress (String, optional)
- shippingCity, shippingState, shippingPostalCode (String, optional)
- gstin, pan (String, optional)

**Supplier Model:**
- userId (ObjectId, reference to User)
- profileId (ObjectId, reference to BusinessProfile)
- name (String, required)
- email, phone, address (String, optional)
- gstin, pan (String, optional)
- bankName, bankBranch, accountNumber, ifscCode, upiId (String, optional)

**Item Model:**
- userId (ObjectId, reference to User)
- profileId (ObjectId, reference to BusinessProfile)
- name (String, required)
- hsnSac (String, optional)
- unit (String, required)
- rate (Number, required)
- discount (Number, default: 0)
- cgst, sgst, igst (Number, required)
- description (String, optional)


**Payment Model:**
- userId (ObjectId, reference to User)
- profileId (ObjectId, reference to BusinessProfile)
- documentId (ObjectId, reference to Document, optional)
- customerId (ObjectId, reference to Customer, optional)
- amount (Number, required)
- currency (String, default: INR)
- date (String, required)
- method (String: cash/cheque/online, optional)
- reference (String, optional)
- notes (String, optional)

**Counter Model:**
- userId (ObjectId, reference to User)
- profileId (ObjectId, reference to BusinessProfile)
- docType (String: invoice/quotation/etc.)
- value (Number, auto-increment)

**PasswordResetOtp Model:**
- userId (ObjectId, reference to User)
- email (String)
- otpHash (String, bcrypt hashed)
- expiresAt (Date)
- attempts (Number, default: 0)
- usedAt (Date, optional)

### 6.2 Data Validation Rules

**REQ-DATA-001:** Email SHALL match valid email format  
**REQ-DATA-002:** Phone SHALL be in E.164 format (+919999999999)  
**REQ-DATA-003:** Password SHALL be minimum 6 characters  
**REQ-DATA-004:** GSTIN SHALL be 15 characters alphanumeric (if provided)  
**REQ-DATA-005:** PAN SHALL be 10 characters alphanumeric (if provided)  
**REQ-DATA-006:** Document numbers SHALL be unique per type per profile  
**REQ-DATA-007:** Dates SHALL be in YYYY-MM-DD format  
**REQ-DATA-008:** Amounts SHALL be non-negative numbers  
**REQ-DATA-009:** Percentages SHALL be between 0 and 100  
**REQ-DATA-010:** Currency codes SHALL be valid ISO codes

### 6.3 Data Retention and Backup

**REQ-BACKUP-001:** System SHALL backup database daily  
**REQ-BACKUP-002:** System SHALL retain backups for minimum 30 days  
**REQ-BACKUP-003:** System SHALL test backup restoration quarterly  
**REQ-BACKUP-004:** System SHALL retain financial documents for 6 years minimum  
**REQ-BACKUP-005:** System SHALL provide data export functionality  
**REQ-BACKUP-006:** System SHALL encrypt backups at rest

---

## 7. Appendices

### 7.1 Glossary

**Terms and Definitions:**

- **API**: Application Programming Interface
- **CGST**: Central Goods and Services Tax
- **GST**: Goods and Services Tax (India)
- **GSTIN**: GST Identification Number
- **HSN**: Harmonized System of Nomenclature (for goods)
- **IGST**: Integrated Goods and Services Tax
- **JWT**: JSON Web Token
- **OTP**: One-Time Password
- **PAN**: Permanent Account Number (India)
- **REST**: Representational State Transfer
- **RS256**: RSA Signature with SHA-256
- **SAC**: Services Accounting Code (for services)
- **SGST**: State Goods and Services Tax
- **SPA**: Single Page Application
- **UPI**: Unified Payments Interface (India)


### 7.2 Acronyms and Abbreviations

- **API**: Application Programming Interface
- **CORS**: Cross-Origin Resource Sharing
- **CSS**: Cascading Style Sheets
- **DB**: Database
- **E.164**: International phone number format standard
- **HTML**: HyperText Markup Language
- **HTTP**: HyperText Transfer Protocol
- **HTTPS**: HTTP Secure
- **ID**: Identifier
- **ISO**: International Organization for Standardization
- **JS**: JavaScript
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **ODM**: Object Document Mapper
- **OTP**: One-Time Password
- **PDF**: Portable Document Format
- **QR**: Quick Response (code)
- **REST**: Representational State Transfer
- **SMS**: Short Message Service
- **SQL**: Structured Query Language
- **SRS**: Software Requirements Specification
- **SSL**: Secure Sockets Layer
- **TLS**: Transport Layer Security
- **UI**: User Interface
- **URL**: Uniform Resource Locator
- **UX**: User Experience

### 7.3 Technology Stack

**Frontend:**
- React 18.3.1
- TypeScript
- Vite 6.3.5
- Tailwind CSS 4.1.12
- Radix UI components
- React Router 7.13.0
- Recharts 2.15.2 (for analytics charts)
- html2canvas 1.4.1 (for PDF generation)
- jsPDF 4.2.0 (for PDF generation)
- jose 5.2.4 (for JWT verification)

**Backend:**
- Node.js v18+
- Express 4.19.2
- MongoDB v8+
- Mongoose 8.10.1
- bcryptjs 2.4.3 (password hashing)
- jsonwebtoken 9.0.2 (JWT signing)
- cors 2.8.5
- dotenv 16.4.7

**Development Tools:**
- Vite (build tool)
- TypeScript compiler
- ESLint (code linting)
- Git (version control)

### 7.4 Deployment Architecture

**Production Environment:**
```
[Client Browser]
      ↓ HTTPS
[Load Balancer]
      ↓
[Web Server - Static Files]
      ↓ API Calls
[Application Server - Node.js/Express]
      ↓
[MongoDB Database]
      ↓
[Backup Storage]

External Services:
- Twilio SMS Gateway
- SSL Certificate Provider
```

**Development Environment:**
```
[Developer Machine]
      ↓
[Vite Dev Server] (Frontend - Port 5173)
      ↓ API Calls
[Express Server] (Backend - Port 4000)
      ↓
[MongoDB Local/Cloud]
```


### 7.5 Environment Variables

**Backend (.env):**
```
# Database
MONGODB_URI=mongodb://localhost:27017/billbuddy24

# Authentication
JWT_SECRET=your-secret-key-here

# Subscription Token Signing (RS256)
SUBSCRIPTION_JWT_PRIVATE_KEY_FILE=/path/to/private.pem
SUBSCRIPTION_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
SUBSCRIPTION_JWT_KID=key-id-optional
SUBSCRIPTION_MAX_OFFLINE_SECONDS=604800

# Session
SESSION_LOCK_MINUTES=1440

# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM=+1234567890
```

**Frontend (.env):**
```
# API Configuration
VITE_API_URL=http://localhost:4000

# Subscription Validation (Public Key for RS256)
VITE_SUBSCRIPTION_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
```

### 7.6 Security Considerations

**Authentication Security:**
- Passwords hashed with bcrypt (10+ salt rounds)
- JWT tokens with 7-day expiry
- Single-device session enforcement
- Device ID tracking
- Session timeout after inactivity

**Subscription Security:**
- RS256 asymmetric signing for offline tokens
- Private key stored only on backend
- Public key safe to distribute to frontend
- Token signature verification prevents tampering
- Time rollback detection
- Maximum offline duration enforcement

**Data Security:**
- HTTPS encryption in transit
- Password hashing at rest
- Environment variables for secrets
- Input sanitization to prevent injection
- CORS policy to restrict origins
- Profile-based data isolation

**API Security:**
- Bearer token authentication
- Device ID validation
- Profile ownership validation
- Rate limiting on auth endpoints
- Error messages don't expose internals


### 7.7 Testing Requirements

**Unit Testing:**
- Test individual functions and components
- Test data validation logic
- Test calculation functions (GST, totals)
- Test utility functions
- Target: 80% code coverage

**Integration Testing:**
- Test API endpoints
- Test database operations
- Test authentication flow
- Test subscription validation
- Test document creation workflow

**End-to-End Testing:**
- Test complete user workflows
- Test signup to document creation
- Test payment recording flow
- Test PDF generation
- Test offline mode scenarios

**Security Testing:**
- Test authentication bypass attempts
- Test SQL/NoSQL injection
- Test XSS vulnerabilities
- Test CSRF protection
- Test session hijacking prevention

**Performance Testing:**
- Load testing with 100 concurrent users
- Stress testing database queries
- Test PDF generation performance
- Test API response times
- Test frontend rendering performance

**Compatibility Testing:**
- Test on Chrome, Firefox, Safari, Edge
- Test on Windows, macOS, Linux
- Test on different screen resolutions
- Test on mobile devices

### 7.8 Future Enhancements

**Planned Features (Not in v1.0):**

1. **Multi-language Support**
   - Hindi, English, regional languages
   - Localized date/number formats

2. **Email Integration**
   - Send invoices via email
   - Email payment reminders
   - Email notifications

3. **WhatsApp Integration**
   - Share invoices via WhatsApp
   - Payment reminders via WhatsApp

4. **Inventory Management**
   - Stock tracking
   - Low stock alerts
   - Purchase orders

5. **Expense Tracking**
   - Record business expenses
   - Expense categories
   - Profit/loss reports

6. **Multi-currency Support**
   - Real-time exchange rates
   - Multi-currency invoices
   - Currency conversion

7. **Recurring Invoices**
   - Automatic invoice generation
   - Subscription billing
   - Scheduled invoices

8. **Payment Gateway Integration**
   - Online payment collection
   - Razorpay/Stripe integration
   - Payment links

9. **Mobile Apps**
   - iOS app
   - Android app
   - Offline-first mobile experience

10. **Advanced Analytics**
    - Predictive analytics
    - Cash flow forecasting
    - Customer insights


### 7.9 Known Limitations

**Current Version Limitations:**

1. **Single Currency per Document**: While items support multiple currencies, calculations assume single currency per document
2. **No Real-time Collaboration**: Multiple users cannot edit same document simultaneously
3. **Limited Offline Duration**: Maximum 7 days offline before revalidation required
4. **No Inventory Tracking**: System does not track stock levels
5. **No Email Sending**: Documents must be manually shared
6. **No Payment Gateway**: Payments recorded manually, no online collection
7. **No Mobile Apps**: Web-only, responsive design for mobile browsers
8. **Single Language**: English only in v1.0
9. **No Document Templates**: Fixed document layouts, limited customization
10. **No Bulk Operations**: No bulk import/export of customers/items

### 7.10 Support and Maintenance

**Support Channels:**
- Email support: support@billbuddy24.com
- Documentation: docs.billbuddy24.com
- Issue tracking: GitHub Issues

**Maintenance Schedule:**
- Database backups: Daily at 2:00 AM IST
- System updates: Monthly (first Sunday)
- Security patches: As needed (within 48 hours)
- Planned downtime: Announced 7 days in advance

**SLA (Service Level Agreement):**
- Uptime: 99% (excluding planned maintenance)
- Support response: Within 24 hours
- Critical bug fixes: Within 48 hours
- Feature requests: Evaluated quarterly

### 7.11 Document Approval

**Approval Signatures:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | Aditya Singh Rajput | _____________ | _________ |
| Project Manager | _____________ | _____________ | _________ |
| QA Lead | _____________ | _____________ | _________ |
| Business Owner | _____________ | _____________ | _________ |

### 7.12 Change Log

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 25, 2026 | Aditya Singh Rajput | Initial SRS document created |

---

## Document End

**Document Status:** Draft  
**Next Review Date:** March 25, 2026  
**Document Owner:** Aditya Singh Rajput  
**Last Updated:** February 25, 2026

---

**Note:** This SRS document will be updated only upon explicit request. All changes will be tracked in the revision history and change log sections.

