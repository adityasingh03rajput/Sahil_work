# Master Admin Panel - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Bill Vyapar Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  Regular Users   │              │  Master Admins   │         │
│  │  (Tenants)       │              │  (Platform Mgmt) │         │
│  └────────┬─────────┘              └────────┬─────────┘         │
│           │                                  │                   │
│           │                                  │                   │
│  ┌────────▼─────────┐              ┌────────▼─────────┐         │
│  │  Regular App     │              │  Admin Panel     │         │
│  │  /dashboard      │              │  /master-admin   │         │
│  │  /documents      │              │  /dashboard      │         │
│  │  /customers      │              │  /tenants        │         │
│  └────────┬─────────┘              └────────┬─────────┘         │
│           │                                  │                   │
│           │         ┌──────────────┐         │                   │
│           └────────►│  API Server  │◄────────┘                   │
│                     │  Express.js  │                             │
│                     └──────┬───────┘                             │
│                            │                                     │
│                     ┌──────▼───────┐                             │
│                     │   MongoDB    │                             │
│                     │   Database   │                             │
│                     └──────────────┘                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model Relationships

```
┌──────────────┐
│ MasterAdmin  │
│ (Platform)   │
└──────┬───────┘
       │ performs actions
       │
       ▼
┌──────────────┐
│  AuditLog    │
│  (Tracking)  │
└──────────────┘


┌──────────────┐         ┌──────────────┐
│     User     │◄────────│    Tenant    │
│  (Identity)  │ owns    │  (Customer)  │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ creates                │ has
       │                        │
       ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Business   │         │    Tenant    │────────►│     Plan     │
│   Profile    │         │   License    │ uses    │  (Pricing)   │
└──────────────┘         └──────┬───────┘         └──────────────┘
                                │
                                │ tracks
                                │
                                ▼
                         ┌──────────────┐
                         │    Tenant    │
                         │   Payment    │
                         └──────────────┘
```

## Authentication Flow

### Regular User Authentication
```
User Login
    │
    ▼
POST /auth/signin
    │
    ├─► Verify User credentials
    │
    ├─► Check Session (device lock)
    │
    ├─► Generate JWT (user token)
    │
    └─► Return: { user, session, accessToken }
```

### Master Admin Authentication
```
Admin Login
    │
    ▼
POST /master-admin/auth/signin
    │
    ├─► Verify MasterAdmin credentials
    │
    ├─► Check status (active only)
    │
    ├─► Generate JWT (admin token)
    │
    └─► Return: { admin, accessToken }
```

## Request Flow with Enforcement

### Regular User Request
```
Client Request
    │
    ▼
requireAuth middleware
    │ (verify JWT)
    ▼
requireValidDeviceSession
    │ (check device lock)
    ▼
enforceTenantAccess ◄─── NEW ENFORCEMENT
    │
    ├─► Find Tenant by userId
    │
    ├─► Check status
    │   ├─ suspended? → 403 BLOCKED
    │   └─ active → continue
    │
    ├─► Check TenantLicense
    │   ├─ expired? → 402 BLOCKED
    │   ├─ in grace? → limited access
    │   └─ valid → continue
    │
    ▼
requireProfile
    │ (X-Profile-ID header)
    ▼
Route Handler
    │
    ▼
Response
```

### Master Admin Request
```
Admin Request
    │
    ▼
requireMasterAdmin middleware
    │
    ├─► Verify JWT
    │
    ├─► Check MasterAdmin exists
    │
    ├─► Check status (active only)
    │
    └─► Continue to handler
    │
    ▼
Route Handler
    │
    ├─► Perform action
    │
    ├─► Log to AuditLog
    │
    └─► Return response
```

## License Enforcement Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    License Check Flow                        │
└─────────────────────────────────────────────────────────────┘

User makes request
    │
    ▼
Find Tenant by userId
    │
    ├─► No Tenant? → Allow (backward compatibility)
    │
    └─► Tenant exists
        │
        ▼
    Check Tenant.status
        │
        ├─► suspended → BLOCK (403)
        │
        └─► active
            │
            ▼
        Find TenantLicense
            │
            ├─► No License? → Allow (backward compatibility)
            │
            └─► License exists
                │
                ▼
            Check expiration
                │
                ├─► now > licenseEndAt?
                │   │
                │   ├─► Has grace period?
                │   │   │
                │   │   ├─► now <= graceEndAt?
                │   │   │   └─► Allow (limited)
                │   │   │
                │   │   └─► now > graceEndAt?
                │   │       └─► BLOCK (402)
                │   │
                │   └─► No grace period
                │       └─► BLOCK (402)
                │
                └─► now <= licenseEndAt
                    └─► ALLOW (full access)
```

## Database Schema

### Collections

```
masteradmins
├─ _id: ObjectId
├─ email: String (unique, indexed)
├─ passwordHash: String
├─ name: String
├─ role: String (super_admin|admin|support)
├─ status: String (active|disabled)
├─ permissions: [String]
├─ createdAt: Date
└─ updatedAt: Date

tenants
├─ _id: ObjectId
├─ ownerUserId: ObjectId → users._id (unique, indexed)
├─ name: String
├─ email: String
├─ phone: String
├─ gstin: String
├─ status: String (active|expired|suspended, indexed)
├─ notes: String
├─ createdAt: Date
└─ updatedAt: Date

plans
├─ _id: ObjectId
├─ name: String (unique)
├─ displayName: String
├─ description: String
├─ durations: [{ days, price, currency }]
├─ seatPrice: Number
├─ limits: {
│   ├─ maxSeats: Number
│   ├─ maxDocumentsPerMonth: Number
│   ├─ maxCustomers: Number
│   ├─ maxSuppliers: Number
│   ├─ maxItems: Number
│   └─ maxPdfExportsPerMonth: Number
│ }
├─ entitlements: {
│   ├─ documentsEnabled: [String]
│   ├─ pdfTemplatesEnabled: [String]
│   ├─ gstinLookupEnabled: Boolean
│   ├─ customFieldsEnabled: Boolean
│   ├─ advancedChargesEnabled: Boolean
│   ├─ csvExportEnabled: Boolean
│   ├─ whatsappEnabled: Boolean
│   ├─ smsEnabled: Boolean
│   └─ emailEnabled: Boolean
│ }
├─ isActive: Boolean
├─ createdAt: Date
└─ updatedAt: Date

tenantlicenses
├─ _id: ObjectId
├─ tenantId: ObjectId → tenants._id (unique, indexed)
├─ planId: ObjectId → plans._id
├─ licenseStartAt: Date
├─ licenseEndAt: Date
├─ graceEndAt: Date
├─ paymentState: String (paid|unpaid|grace)
├─ maxSeats: Number
├─ customEntitlements: Mixed
├─ createdAt: Date
└─ updatedAt: Date

tenantpayments
├─ _id: ObjectId
├─ tenantId: ObjectId → tenants._id (indexed)
├─ licenseId: ObjectId → tenantlicenses._id
├─ amount: Number
├─ currency: String
├─ paidAt: Date
├─ mode: String
├─ reference: String
├─ status: String (pending|paid|failed)
├─ notes: String
├─ createdAt: Date
└─ updatedAt: Date

auditlogs
├─ _id: ObjectId
├─ actorMasterAdminId: ObjectId → masteradmins._id (indexed)
├─ tenantId: ObjectId → tenants._id (indexed)
├─ action: String (indexed)
├─ before: Mixed
├─ after: Mixed
├─ metadata: Mixed
└─ createdAt: Date (indexed)
```

## API Endpoints Map

```
/master-admin
│
├─ /auth
│  └─ POST /signin
│
├─ /dashboard
│  └─ GET /stats
│
├─ /tenants
│  ├─ GET /
│  ├─ GET /:id
│  ├─ POST /
│  ├─ PUT /:id
│  ├─ POST /:id/suspend
│  └─ POST /:id/reactivate
│
├─ /plans
│  ├─ GET /
│  ├─ POST /
│  └─ PUT /:id
│
├─ /licenses
│  ├─ POST /:tenantId
│  └─ POST /:tenantId/extend
│
└─ /audit
   └─ GET /
```

## Frontend Routes Map

```
/master-admin
│
├─ /login              → LoginPage
├─ /dashboard          → DashboardPage
├─ /tenants            → TenantsPage
├─ /plans              → PlansPage
└─ /audit              → AuditPage
```

## State Management

### Frontend State
```
localStorage
├─ masterAdminToken    (JWT for API calls)
├─ masterAdmin         (Admin user info)
├─ accessToken         (Regular user token)
├─ user                (Regular user info)
├─ currentProfile      (Selected business profile)
└─ deviceId            (Device identifier)
```

### Backend State
```
MongoDB Collections
├─ masteradmins        (Admin accounts)
├─ tenants             (Customer accounts)
├─ plans               (Pricing plans)
├─ tenantlicenses      (Active licenses)
├─ tenantpayments      (Payment records)
├─ auditlogs           (Action history)
├─ users               (Regular users)
├─ sessions            (Device sessions)
├─ subscriptions       (Legacy subscriptions)
└─ businessprofiles    (Business data)
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Layer 1: Authentication                                 │
│  ├─ JWT token verification                               │
│  ├─ Token expiration check                               │
│  └─ Separate tokens for users vs admins                  │
│                                                           │
│  Layer 2: Authorization                                  │
│  ├─ Role-based access (super_admin/admin/support)        │
│  ├─ Status check (active only)                           │
│  └─ Permission validation                                │
│                                                           │
│  Layer 3: Tenant Enforcement                             │
│  ├─ Tenant status check (suspended blocks all)           │
│  ├─ License expiration check                             │
│  └─ Grace period handling                                │
│                                                           │
│  Layer 4: Resource Access                                │
│  ├─ Profile ownership validation                         │
│  ├─ Data scoping by userId/profileId                     │
│  └─ Device session validation                            │
│                                                           │
│  Layer 5: Audit Trail                                    │
│  ├─ All admin actions logged                             │
│  ├─ Before/after state capture                           │
│  └─ Actor tracking                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production Setup                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐                                         │
│  │   Clients   │                                         │
│  └──────┬──────┘                                         │
│         │                                                 │
│         ▼                                                 │
│  ┌─────────────┐                                         │
│  │  CDN/Nginx  │ (SSL/TLS)                               │
│  └──────┬──────┘                                         │
│         │                                                 │
│         ├──────────────┬──────────────┐                  │
│         │              │              │                  │
│         ▼              ▼              ▼                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │  App     │   │  Admin   │   │   API    │            │
│  │  Server  │   │  Panel   │   │  Server  │            │
│  │  (React) │   │  (React) │   │ (Express)│            │
│  └──────────┘   └──────────┘   └────┬─────┘            │
│                                      │                   │
│                                      ▼                   │
│                               ┌──────────┐              │
│                               │ MongoDB  │              │
│                               │ Cluster  │              │
│                               └──────────┘              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling
- API servers can be load balanced
- Stateless JWT authentication enables multi-server deployment
- MongoDB replica sets for high availability

### Caching Strategy
- License checks can be cached (short TTL)
- Plan data rarely changes (longer cache)
- Audit logs write-only (no cache needed)

### Performance Optimization
- Database indexes on frequently queried fields
- Pagination for large result sets
- Aggregation pipelines for dashboard stats
- Lean queries for read-only operations

## Monitoring & Observability

### Key Metrics to Track
- Active tenants count
- License expiration rate
- API response times
- Error rates by endpoint
- Audit log volume
- Database query performance

### Alerts to Configure
- Tenant suspension events
- License expiration warnings (7/30 days)
- Failed authentication attempts
- Database connection issues
- High error rates

## Backup & Recovery

### Data to Backup
- MongoDB full database backup (daily)
- Audit logs (critical for compliance)
- Master admin accounts
- Tenant and license data

### Recovery Procedures
- Point-in-time recovery for MongoDB
- Audit log replay for data reconstruction
- Master admin account recovery process
