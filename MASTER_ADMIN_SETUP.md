# Master Admin Panel Setup Guide

## Overview
A complete Master Admin Panel has been created for Bill Vyapar to manage tenants, plans, licenses, and platform operations.

## Backend Implementation

### New Models Created
1. **MasterAdmin** - Super admin accounts with role-based access
2. **Tenant** - Customer account records linked to User
3. **Plan** - Subscription plans with pricing and entitlements
4. **TenantLicense** - Time-based licenses for tenants
5. **TenantPayment** - Payment tracking for subscriptions
6. **AuditLog** - Complete audit trail of admin actions

### API Routes
All routes are under `/master-admin` prefix:

- **Auth**: `/master-admin/auth/signin`
- **Dashboard**: `/master-admin/dashboard/stats`
- **Tenants**: 
  - GET `/master-admin/tenants` - List all tenants
  - GET `/master-admin/tenants/:id` - Get tenant details
  - POST `/master-admin/tenants` - Create tenant
  - PUT `/master-admin/tenants/:id` - Update tenant
  - POST `/master-admin/tenants/:id/suspend` - Suspend tenant
  - POST `/master-admin/tenants/:id/reactivate` - Reactivate tenant
- **Plans**:
  - GET `/master-admin/plans` - List all plans
  - POST `/master-admin/plans` - Create plan
  - PUT `/master-admin/plans/:id` - Update plan
- **Licenses**:
  - POST `/master-admin/licenses/:tenantId` - Assign/update license
  - POST `/master-admin/licenses/:tenantId/extend` - Extend license
- **Audit**: GET `/master-admin/audit` - View audit logs

## Frontend Implementation

### New Pages Created
1. **LoginPage** - Master admin authentication
2. **DashboardPage** - Overview with key metrics
3. **TenantsPage** - Manage all tenants
4. **PlansPage** - Manage subscription plans
5. **AuditPage** - View audit logs

### Routes
- `/master-admin/login` - Admin login
- `/master-admin/dashboard` - Main dashboard
- `/master-admin/tenants` - Tenant management
- `/master-admin/plans` - Plan management
- `/master-admin/audit` - Audit logs

## Setup Instructions

### 1. Create Master Admin Account

Run this command in the backend directory:

```bash
cd backend
npm run create-master-admin
```

This creates the super admin account:
- **Email**: adityarajsir162@gmail.com
- **Password**: adi*tya
- **Role**: super_admin

### 2. Access the Panel

1. Navigate to: `http://localhost:5173/master-admin/login`
2. Login with the credentials above
3. You'll be redirected to the dashboard

### 3. Create Default Plans (Optional)

You can create plans through the UI or directly in MongoDB. Example plan structure:

```javascript
{
  name: "basic",
  displayName: "Basic Plan",
  description: "For small businesses",
  durations: [
    { days: 30, price: 499, currency: "INR" },
    { days: 365, price: 4999, currency: "INR" }
  ],
  seatPrice: 100,
  limits: {
    maxSeats: 5,
    maxDocumentsPerMonth: 100,
    maxCustomers: 500,
    maxSuppliers: 200,
    maxItems: 1000,
    maxPdfExportsPerMonth: 100
  },
  entitlements: {
    documentsEnabled: ["invoice", "quotation", "order", "challan"],
    pdfTemplatesEnabled: ["minimal", "classic"],
    gstinLookupEnabled: true,
    customFieldsEnabled: true,
    advancedChargesEnabled: false,
    csvExportEnabled: true,
    whatsappEnabled: false,
    smsEnabled: false,
    emailEnabled: true
  },
  isActive: true
}
```

## Features Implemented

### Phase 1 (MVP) ✅
- ✅ Master Admin authentication
- ✅ Tenants CRUD operations
- ✅ Plans CRUD with duration + pricing
- ✅ License assignment and extension
- ✅ Per-user seat limit configuration
- ✅ Tenant suspend/reactivate
- ✅ Dashboard with key metrics
- ✅ Audit logs for all actions

### Dashboard Metrics
- Total tenants count
- Active/Expired/Suspended breakdown
- Tenants expiring in 7/30 days
- Total revenue tracking

### Tenant Management
- Search and filter tenants
- View detailed tenant information
- Suspend/reactivate accounts
- Assign and manage licenses
- Track license expiration

### Audit Trail
Every critical action is logged:
- Tenant created/updated/suspended/reactivated
- Plan created/updated
- License assigned/extended
- Includes before/after state for changes

## Security Features

1. **Separate Authentication**: Master admins use different auth system from regular users
2. **Role-Based Access**: Support for super_admin, admin, support roles
3. **JWT Token Authentication**: Secure token-based auth
4. **Audit Logging**: Complete trail of all admin actions
5. **Status Checks**: Active status required for admin access

## Next Steps (Phase 2 & 3)

### Phase 2
- [ ] Entitlements management per tenant
- [ ] Usage counters and quota enforcement
- [ ] Renewals dashboard with reminders
- [ ] Payment records management
- [ ] Bulk operations for tenants

### Phase 3
- [ ] Impersonation feature (login as tenant)
- [ ] Broadcast messages to tenants
- [ ] Advanced analytics and reports
- [ ] Email notifications for expiring licenses
- [ ] Revenue analytics and MRR tracking

## Database Schema

### Tenant Identity
- Tenant is identified by `ownerUserId` (the User._id)
- One User can have one Tenant record
- Business profiles are tenant data, not tenant identity

### License Model
- Time-based access (Photoshop-style)
- License window: `licenseStartAt` to `licenseEndAt`
- Grace period support: `graceEndAt`
- Payment states: paid, unpaid, grace

### Per-User Pricing
- Base plan price + (seat_price × active_user_count)
- Configurable `maxSeats` per tenant
- Seat enforcement at user creation

## Testing

1. **Create Master Admin**: Run the script to create admin account
2. **Login**: Access `/master-admin/login` and authenticate
3. **View Dashboard**: Check metrics are loading
4. **Create Plan**: Add a test plan with pricing
5. **Create Tenant**: Link to an existing user
6. **Assign License**: Give tenant a plan with duration
7. **Check Audit**: Verify all actions are logged

## Troubleshooting

### Cannot login to master admin
- Ensure you ran `npm run create-master-admin`
- Check MongoDB connection
- Verify JWT_SECRET is set in .env

### Tenants not showing
- Check if Tenant records exist in database
- Verify master admin token is valid
- Check browser console for errors

### License assignment fails
- Ensure Plan exists in database
- Verify Tenant exists
- Check tenantId and planId are valid ObjectIds

## Production Deployment

1. **Environment Variables**: Ensure all required env vars are set
2. **Database Indexes**: Models have proper indexes defined
3. **CORS**: Update CORS_ORIGIN to include admin panel domain
4. **Security**: Change default master admin password
5. **Backup**: Regular database backups for audit logs

## API Authentication

All master admin API calls require:
```
Authorization: Bearer <masterAdminToken>
```

Token is obtained from `/master-admin/auth/signin` and stored in localStorage as `masterAdminToken`.
