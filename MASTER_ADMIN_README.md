# Bill Vyapar - Master Admin Panel

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Features](#features)
4. [Documentation](#documentation)
5. [Architecture](#architecture)
6. [Security](#security)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Master Admin Panel is a comprehensive platform management system for Bill Vyapar that enables you to:

- **Manage Tenants**: Control all customer accounts, suspend/reactivate access
- **Configure Plans**: Create and manage subscription plans with flexible pricing
- **Assign Licenses**: Time-based access control (Photoshop-style licensing)
- **Track Revenue**: Monitor payments and subscription metrics
- **Audit Actions**: Complete trail of all administrative operations
- **Enforce Limits**: Per-user pricing and seat-based restrictions

### Key Concepts

- **Tenant**: A customer account identified by their User login (ownerUserId)
- **Plan**: Subscription plan with pricing, limits, and feature entitlements
- **License**: Time-bound access window assigned to a tenant
- **Seat**: Per-user pricing unit (base price + seat_price × users)
- **Enforcement**: Automatic blocking of suspended/expired tenants

## 🚀 Quick Start

### 1. Create Master Admin Account

```bash
cd backend
npm run create-master-admin
```

**Credentials Created:**
- Email: `adityarajsir162@gmail.com`
- Password: `adi*tya`
- Role: `super_admin`

### 2. Seed Default Plans (Optional)

```bash
npm run seed-plans
```

Creates 4 plans: Trial, Basic, Professional, Enterprise

### 3. Access the Panel

1. Start server: `npm run dev`
2. Navigate to: `http://localhost:5173/master-admin/login`
3. Login with credentials above
4. Start managing your platform!

## ✨ Features

### Phase 1 (MVP) - ✅ Implemented

#### Dashboard
- Total tenants count
- Active/Expired/Suspended breakdown
- Tenants expiring in 7/30 days
- Total revenue tracking
- Quick action buttons

#### Tenant Management
- List all tenants with search
- View detailed tenant information
- Create new tenants
- Update tenant details
- Suspend/Reactivate accounts
- Assign and manage licenses
- Track usage statistics

#### Plan Management
- Create subscription plans
- Configure multiple duration options
- Set base price and per-seat pricing
- Define limits (seats, documents, customers, etc.)
- Configure entitlements (feature flags)
- Enable/disable plans

#### License Management
- Assign plans to tenants
- Set license duration
- Extend licenses by days
- Configure grace periods
- Track expiration dates
- Manage payment states

#### Audit Trail
- Complete action logging
- Before/after state capture
- Actor tracking
- Filterable by tenant/action
- Timestamp information

#### Tenant Enforcement
- Automatic access blocking for suspended tenants
- License expiration enforcement
- Grace period support
- Proper HTTP error codes (402, 403)

### Phase 2 (Planned)
- [ ] Entitlements UI (toggle features per tenant)
- [ ] Usage counters and quota enforcement
- [ ] Renewals dashboard with reminders
- [ ] Payment records management
- [ ] Bulk operations

### Phase 3 (Planned)
- [ ] Impersonation (login as tenant)
- [ ] Broadcast messages
- [ ] Advanced analytics (MRR, churn)
- [ ] Email notifications
- [ ] Revenue reports

## 📚 Documentation

### Complete Documentation Set

1. **[MASTER_ADMIN_QUICKSTART.md](MASTER_ADMIN_QUICKSTART.md)**
   - Get started in 3 steps
   - Common tasks and examples
   - Troubleshooting guide

2. **[MASTER_ADMIN_SETUP.md](MASTER_ADMIN_SETUP.md)**
   - Detailed setup instructions
   - Configuration guide
   - Testing checklist
   - Production deployment

3. **[MASTER_ADMIN_ARCHITECTURE.md](MASTER_ADMIN_ARCHITECTURE.md)**
   - System architecture diagrams
   - Data model relationships
   - Authentication flows
   - Security layers

4. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
   - Technical implementation details
   - Files created/modified
   - Design decisions
   - Future enhancements

5. **[MASTER_ADMIN_PANEL.md](MASTER_ADMIN_PANEL.md)**
   - Original specification
   - Requirements and goals
   - Feature breakdown

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                  Bill Vyapar Platform                │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Regular Users          Master Admins                │
│       │                      │                       │
│       ▼                      ▼                       │
│  ┌─────────┐          ┌─────────┐                   │
│  │ App UI  │          │ Admin   │                   │
│  │ React   │          │ Panel   │                   │
│  └────┬────┘          └────┬────┘                   │
│       │                    │                         │
│       └────────┬───────────┘                         │
│                │                                     │
│                ▼                                     │
│         ┌──────────────┐                             │
│         │  API Server  │                             │
│         │  Express.js  │                             │
│         └──────┬───────┘                             │
│                │                                     │
│                ▼                                     │
│         ┌──────────────┐                             │
│         │   MongoDB    │                             │
│         └──────────────┘                             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Database Models

- **MasterAdmin**: Platform admin accounts
- **Tenant**: Customer account records
- **Plan**: Subscription plans with pricing
- **TenantLicense**: Time-based licenses
- **TenantPayment**: Payment tracking
- **AuditLog**: Action audit trail

### Request Flow

```
User Request
    ↓
Authentication (JWT)
    ↓
Device Session Check
    ↓
Tenant Enforcement ← NEW
    ├─ Check suspended
    ├─ Check license expired
    └─ Check grace period
    ↓
Profile Validation
    ↓
Route Handler
    ↓
Response
```

## 🔐 Security

### Authentication
- Separate auth system for master admins
- JWT token-based authentication
- 7-day token expiration
- Secure password hashing (bcrypt)

### Authorization
- Role-based access control
- Status validation (active only)
- Permission system ready

### Tenant Enforcement
- Automatic blocking of suspended accounts
- License expiration checks
- Grace period support
- Proper error codes

### Audit Trail
- All admin actions logged
- Before/after state capture
- Actor tracking
- Immutable logs

### Production Security Checklist
- [ ] Change default master admin password
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS for production domains
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring/alerting
- [ ] Review audit logs regularly

## 📡 API Reference

### Base URL
```
http://localhost:4000/master-admin
```

### Authentication
All endpoints require `Authorization: Bearer <token>` header (except `/auth/signin`)

### Endpoints

#### Auth
```
POST /auth/signin
Body: { email, password }
Response: { admin, accessToken }
```

#### Dashboard
```
GET /dashboard/stats
Response: {
  totalTenants,
  activeTenants,
  expiredTenants,
  suspendedTenants,
  expiringIn7Days,
  expiringIn30Days,
  totalRevenue
}
```

#### Tenants
```
GET /tenants?search=<query>&status=<status>&page=1&limit=50
GET /tenants/:id
POST /tenants
PUT /tenants/:id
POST /tenants/:id/suspend
POST /tenants/:id/reactivate
```

#### Plans
```
GET /plans
POST /plans
PUT /plans/:id
```

#### Licenses
```
POST /licenses/:tenantId
Body: { planId, durationDays, maxSeats, customEntitlements }

POST /licenses/:tenantId/extend
Body: { days }
```

#### Audit
```
GET /audit?tenantId=<id>&action=<action>&page=1&limit=50
```

### Error Codes
- `401 Unauthorized`: Invalid/missing token
- `402 Payment Required`: License expired
- `403 Forbidden`: Tenant suspended or access denied
- `404 Not Found`: Resource doesn't exist
- `400 Bad Request`: Invalid input

## 🐛 Troubleshooting

### Cannot Login to Master Admin
**Problem**: "Invalid credentials" error

**Solutions**:
1. Verify you ran `npm run create-master-admin`
2. Check MongoDB connection in backend/.env
3. Ensure JWT_SECRET is set
4. Check browser console for errors

### Dashboard Shows Zero Stats
**Problem**: All metrics show 0

**Solutions**:
1. This is normal for new installation (no tenants yet)
2. Create test tenants via API
3. Wait for users to sign up
4. Check MongoDB connection

### Tenant Not Blocked When Suspended
**Problem**: User can still access after suspension

**Solutions**:
1. Ensure Tenant record exists for the user
2. Verify tenant status is 'suspended' in database
3. Check if tenant enforcement middleware is active
4. Clear user's localStorage and force re-login

### Plans Not Showing
**Problem**: Plans page is empty

**Solutions**:
1. Run `npm run seed-plans`
2. Create plans manually via API
3. Check MongoDB connection
4. Verify plans collection exists

## 🎯 Common Tasks

### Create a Tenant
```bash
curl -X POST http://localhost:4000/master-admin/tenants \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerUserId": "<user-id>",
    "name": "ABC Company",
    "email": "contact@abc.com",
    "phone": "+919999999999",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

### Assign License
```bash
curl -X POST http://localhost:4000/master-admin/licenses/<tenant-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "<plan-id>",
    "durationDays": 365,
    "maxSeats": 10
  }'
```

### Suspend Tenant
```bash
curl -X POST http://localhost:4000/master-admin/tenants/<tenant-id>/suspend \
  -H "Authorization: Bearer <token>"
```

### Extend License
```bash
curl -X POST http://localhost:4000/master-admin/licenses/<tenant-id>/extend \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "days": 30 }'
```

## 📊 Monitoring

### Key Metrics to Track
- Active tenants count
- License expiration rate
- Revenue trends (MRR)
- API response times
- Error rates
- Audit log volume

### Recommended Alerts
- Tenant suspension events
- License expiration warnings (7/30 days)
- Failed authentication attempts
- Database connection issues
- High error rates

## 🔄 Backup & Recovery

### What to Backup
- MongoDB full database (daily)
- Audit logs (critical for compliance)
- Master admin accounts
- Tenant and license data

### Recovery Procedures
- Point-in-time recovery for MongoDB
- Audit log replay for data reconstruction
- Master admin account recovery process

## 🚀 Production Deployment

### Environment Variables
```env
MONGODB_URI=mongodb://...
JWT_SECRET=<strong-secret>
CORS_ORIGIN=https://admin.billvyapar.com,https://app.billvyapar.com
PORT=4000
```

### Deployment Checklist
- [ ] Change default master admin password
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS_ORIGIN
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Test all endpoints
- [ ] Review security settings
- [ ] Set up logging
- [ ] Configure alerts

## 💡 Tips & Best Practices

1. **Regular Monitoring**: Check dashboard daily for expiring licenses
2. **Audit Review**: Review audit logs weekly for security
3. **Grace Periods**: Set 3-7 day grace periods to avoid abrupt cutoffs
4. **Seat Pricing**: Use per-seat pricing to scale revenue with team size
5. **Custom Plans**: Create custom plans for enterprise customers
6. **Backup Strategy**: Daily automated backups with 30-day retention
7. **Alert Configuration**: Set up alerts for critical events
8. **Documentation**: Keep internal docs updated with custom procedures

## 📞 Support

### Getting Help
1. Check the documentation files listed above
2. Review audit logs for error details
3. Check MongoDB for data consistency
4. Review browser console for frontend errors
5. Check backend logs for API errors

### Reporting Issues
When reporting issues, include:
- Steps to reproduce
- Expected vs actual behavior
- Error messages from console/logs
- Relevant audit log entries
- Environment details (dev/prod)

## 🎓 Learning Resources

### Understanding the System
1. Start with [MASTER_ADMIN_QUICKSTART.md](MASTER_ADMIN_QUICKSTART.md)
2. Review [MASTER_ADMIN_ARCHITECTURE.md](MASTER_ADMIN_ARCHITECTURE.md)
3. Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
4. Explore the API with Postman/curl

### Best Practices
- Follow the tenant lifecycle: Create → Assign License → Monitor → Renew
- Use audit logs to track all changes
- Set up alerts before licenses expire
- Regular backup verification
- Security review quarterly

## 📝 License

This Master Admin Panel is part of the Bill Vyapar platform.

## 🙏 Acknowledgments

Built following the specifications in MASTER_ADMIN_PANEL.md with focus on:
- Security and audit trails
- Scalability and performance
- User experience
- Maintainability

---

**Version**: 1.0.0 (Phase 1 MVP)  
**Last Updated**: March 12, 2026  
**Status**: Production Ready ✅
