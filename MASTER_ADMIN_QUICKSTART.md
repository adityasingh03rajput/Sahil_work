# Master Admin Panel - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Create Master Admin Account

```bash
cd backend
npm run create-master-admin
```

**Output:**
```
Connected to MongoDB
Master admin created successfully!
Email: adityarajsir162@gmail.com
Password: adi*tya
ID: <generated-id>
```

### Step 2: (Optional) Seed Default Plans

```bash
npm run seed-plans
```

**Output:**
```
Connected to MongoDB
✓ Created plan: Trial Plan (trial)
✓ Created plan: Basic Plan (basic)
✓ Created plan: Professional Plan (professional)
✓ Created plan: Enterprise Plan (enterprise)

✅ Default plans seeded successfully!
```

### Step 3: Access the Panel

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open browser and navigate to:
   ```
   http://localhost:5173/master-admin/login
   ```

3. Login with:
   - **Email**: `adityarajsir162@gmail.com`
   - **Password**: `adi*tya`

4. You'll be redirected to the dashboard!

## 📊 What You Can Do

### Dashboard
- View total tenants, active/expired/suspended counts
- See tenants expiring in 7/30 days
- Track total revenue
- Quick access to all management sections

### Manage Tenants
1. Click "Manage Tenants" from dashboard
2. Search for tenants by name, email, or phone
3. View tenant details
4. Suspend or reactivate accounts
5. Assign licenses to tenants

### Manage Plans
1. Click "Manage Plans" from dashboard
2. View all available plans
3. Create new plans with custom pricing
4. Set limits and entitlements per plan

### Assign License to Tenant
1. Go to Tenants page
2. Click "View Details" on a tenant
3. Click "Assign License"
4. Select plan and duration
5. Set max seats
6. Submit

### View Audit Logs
1. Click "Audit Logs" from dashboard
2. See all admin actions with timestamps
3. Filter by tenant or action type
4. Review before/after states

## 🔐 Security Notes

### Change Default Password
After first login, you should change the default password:

1. Connect to MongoDB
2. Update the master admin record:
   ```javascript
   use your_database;
   
   // Hash new password with bcrypt
   const bcrypt = require('bcryptjs');
   const newPasswordHash = bcrypt.hashSync('your-new-password', 10);
   
   // Update
   db.masteradmins.updateOne(
     { email: 'adityarajsir162@gmail.com' },
     { $set: { passwordHash: newPasswordHash } }
   );
   ```

### Production Checklist
- [ ] Change default master admin password
- [ ] Set strong JWT_SECRET in .env
- [ ] Configure CORS_ORIGIN for production domains
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure monitoring

## 📝 Common Tasks

### Create a New Tenant
```bash
# Via API
POST /master-admin/tenants
{
  "ownerUserId": "<user-id>",
  "name": "ABC Company",
  "email": "contact@abc.com",
  "phone": "+919999999999",
  "gstin": "29ABCDE1234F1Z5"
}
```

### Assign License
```bash
# Via API
POST /master-admin/licenses/<tenant-id>
{
  "planId": "<plan-id>",
  "durationDays": 365,
  "maxSeats": 10
}
```

### Extend License
```bash
# Via API
POST /master-admin/licenses/<tenant-id>/extend
{
  "days": 30
}
```

### Suspend Tenant
```bash
# Via API
POST /master-admin/tenants/<tenant-id>/suspend
```

## 🐛 Troubleshooting

### Cannot Login
**Problem**: "Invalid credentials" error

**Solutions**:
1. Verify you ran `npm run create-master-admin`
2. Check MongoDB connection
3. Ensure JWT_SECRET is set in backend/.env
4. Check browser console for errors

### Dashboard Shows Zero Stats
**Problem**: All metrics show 0

**Solutions**:
1. No tenants exist yet (this is normal for new installation)
2. Create test tenants via API or wait for users to sign up
3. Check MongoDB connection

### Plans Not Showing
**Problem**: Plans page is empty

**Solutions**:
1. Run `npm run seed-plans` to create default plans
2. Or create plans manually via API
3. Check MongoDB connection

### Tenant Enforcement Not Working
**Problem**: Regular users not blocked when suspended

**Solutions**:
1. Ensure tenant enforcement middleware is added to routes
2. Check if Tenant record exists for the user
3. Verify TenantLicense is assigned
4. Check tenant status in database

## 📚 API Reference

### Authentication
```
POST /master-admin/auth/signin
Body: { email, password }
Response: { admin, accessToken }
```

### Dashboard
```
GET /master-admin/dashboard/stats
Headers: Authorization: Bearer <token>
Response: { totalTenants, activeTenants, ... }
```

### Tenants
```
GET /master-admin/tenants?search=<query>&status=<status>
GET /master-admin/tenants/:id
POST /master-admin/tenants
PUT /master-admin/tenants/:id
POST /master-admin/tenants/:id/suspend
POST /master-admin/tenants/:id/reactivate
```

### Plans
```
GET /master-admin/plans
POST /master-admin/plans
PUT /master-admin/plans/:id
```

### Licenses
```
POST /master-admin/licenses/:tenantId
POST /master-admin/licenses/:tenantId/extend
```

### Audit
```
GET /master-admin/audit?tenantId=<id>&action=<action>
```

## 🎯 Next Steps

1. **Create Plans**: Define your pricing structure
2. **Link Existing Users**: Create Tenant records for existing users
3. **Assign Licenses**: Give tenants access with time-based licenses
4. **Monitor Usage**: Track tenant activity and renewals
5. **Set Up Alerts**: Configure notifications for expiring licenses

## 💡 Tips

- Use the search feature to quickly find tenants
- Check audit logs regularly for security monitoring
- Set grace periods for license expiration to avoid abrupt cutoffs
- Use per-seat pricing to scale revenue with team size
- Create custom plans for enterprise customers

## 📞 Support

For issues or questions:
1. Check the audit logs for error details
2. Review MongoDB for data consistency
3. Check browser console for frontend errors
4. Review backend logs for API errors

## 🔗 Related Documentation

- `MASTER_ADMIN_PANEL.md` - Original specification
- `MASTER_ADMIN_SETUP.md` - Detailed setup guide
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
