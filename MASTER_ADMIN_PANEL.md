# Bill Vyapar — Master Admin Panel (Single Branding)

## 1) Goal
A **Master Admin Panel** for Bill Vyapar where you (platform owner) can:
- Manage all customer accounts (tenants)
- Control subscription/licensing (Photoshop-style time-based access)
- Configure pricing (plan duration + amount) at any time
- Enforce **per-user pricing** and user limits
- Enable/disable features per tenant (entitlements)
- Monitor usage, payments, and operational health

This document assumes:
- **All customers use the same Bill Vyapar branding** (not white-label)
- Billing is **time-based access** (no token system)
- Pricing can be a combination of:
  - plan-based monthly/quarterly/yearly (master admin sets duration + amount)
  - time-based license windows (start/end dates)
  - per-user pricing (seat-based)

---

## 2) Key Concepts

### 2.1 Tenant (Customer Account)
A **tenant** is one customer account using Bill Vyapar.

Tenant identity rule (as per your decision):
- A tenant is identified by the **tenant admin/owner login (id/password)**.
- The business profile is tenant data, but it is **not** the tenant identity.

A tenant has its own:
- users
- customers/suppliers/items/documents
- business profile/settings (still inside Bill Vyapar brand)

### 2.2 Master Admin vs Tenant Admin
Master admin login rule (as per your decision):
- Master admin uses a **separate account type** from normal tenant users.

Roles:
- **Master Admin**: controls platform-wide policies and each tenant’s access.
- **Tenant Admin/Owner**: tenant identity account; manages their own staff/users and day-to-day billing.

### 2.3 Licensing Model (Photoshop-style)
Access is **time-bound**.
- A tenant is active if `now` is within their **license window** and payment state is acceptable.
- No token deduction; instead, **time and plan** decide what they can do.

### 2.4 Per-User Pricing
A tenant pays based on:
- `base_plan_price` (time-based)
- plus `seat_price * active_user_count`

---

## 3) Master Admin Panel — Core Features

## 3.1 Tenant Management
- **Create tenant**
  - name, GSTIN (optional), phone, email
  - default plan assignment
- **Edit tenant**
  - update details
- **Suspend / Reactivate tenant**
  - immediate platform lockout
- **Soft delete tenant**
  - keeps data for compliance/audit
- **Impersonate tenant admin** (optional but high value)
  - “Login as tenant admin” for support
  - must create an audit entry for every impersonation session

## 3.2 Plan & Pricing Management
Master admin can create and manage **plans**.

Plan fields:
- name (Basic/Pro/Enterprise)
- duration options (e.g., 7 days / 30 days / 90 days / 365 days)
- base price per duration
- per-user seat price (optional)
- included limits (docs/month, users, customers, etc.)
- feature entitlements (modules and premium features)

Master admin controls:
- **Create plan**
- **Update plan price/duration anytime**
- **Assign plan to tenant**
- **Extend license** (add days)
- **Start trial / end trial**
- **Grace period** configuration

## 3.3 Time-Based Subscription / License Windows
For each tenant:
- `license_start_at`
- `license_end_at`
- `status`: active / expired / suspended
- `payment_state`: paid / unpaid / grace

Enforcement:
- if `suspended` => block everything except showing “Account suspended”
- if `expired` and no grace => block creation/export; show renewal prompt
- if `grace` => allow limited actions (configurable)

## 3.4 Per-User (Seat) Enforcement
Master admin should be able to:
- Set `max_seats` per tenant
- Set `seat_price` (if not strictly plan-defined)
- See current active users and seats used
- Lock new user creation when seats exceeded

Tenant-side behavior:
- If seat limit exceeded:
  - block adding users
  - optionally block login for newest users (policy choice)

## 3.5 Entitlements / Feature Gating
Turn features on/off per tenant (overrides plan if needed).

Examples:
- Documents enabled: invoice / quotation / challan / purchase / proforma
- PDF templates enabled: minimal / classic / modern / professional
- GSTIN lookup enabled
- Custom fields enabled
- Advanced charges (TCS, packing) enabled
- Exports (CSV) enabled
- Integrations: WhatsApp/SMS/Email enabled

## 3.6 Limits / Quotas (Usage Limits)
Even though licensing is time-based, you can still enforce limits per plan.

Common limits:
- documents per month
- PDF exports per month
- customers/suppliers max
- items/SKU max
- users max

When limit exceeded:
- block create OR allow but watermark PDFs (policy choice)

## 3.7 Billing Operations (Your Revenue Tracking)
Master admin should have:
- Tenant billing overview
  - current plan, seats, license end date
  - next renewal date
- Invoices/receipts
  - generate invoice for subscription period
  - mark paid/unpaid
  - payment mode (UPI/Bank/Cash)
  - transaction reference
- Renewal management
  - renew, extend, upgrade
- Reports
  - MRR, active trials, upcoming renewals

## 3.8 Support & Monitoring
- Tenant activity
  - last login, last document created
- Error monitoring
  - failed PDF exports, API errors
- Support notes per tenant
- Broadcast message
  - system announcements (maintenance windows)

## 3.9 Audit Logs (Mandatory)
Audit every critical master-admin action:
- plan created/updated
- tenant suspended/reactivated
- license extended
- impersonation
- entitlements changed
- manual payment changes

---

# 4) Recommended Master Admin Screens (UI)

## 4.1 Navigation (Left Sidebar)
- Dashboard
- Tenants
- Plans & Pricing
- Renewals
- Payments
- Entitlements
- Usage & Limits
- Support
- Audit Logs
- System Settings

## 4.2 Dashboard
- total tenants
- active vs expired vs suspended
- trials ending soon
- renewals due in 7/15/30 days
- revenue snapshot (optional)

## 4.3 Tenants List
Columns:
- tenant name
- plan
- license end date
- status (active/expired/suspended)
- seats used / max seats
- last activity
Actions:
- view details
- suspend/reactivate
- extend license
- change plan
- impersonate (optional)

## 4.4 Tenant Details
Tabs:
- Overview
- Users
- Plan & License
- Entitlements
- Usage
- Payments
- Support Notes
- Audit

## 4.5 Plans & Pricing
- plan list
- create plan
- edit plan
- set duration/amount
- set seat price
- set limits
- set entitlements

## 4.6 Renewals
- due renewals list
- bulk reminders (optional)
- extend/renew actions

## 4.7 Payments
- list all payments
- payment status filters
- export report (optional)

## 4.8 Audit Logs
- filter by tenant
- filter by master admin user
- filter by action

---

# 5) Data Model (Backend) — Suggested Entities

## 5.1 MasterAdminUser
- id
- email/username
- password_hash
- roles/permissions
- status: active | disabled
- created_at

## 5.2 Tenant
- id
- owner_user_id (the tenant identity login)
- name
- email
- phone
- gstin (optional)
- status: active | expired | suspended
- created_at

## 5.3 TenantUser
- id
- tenant_id
- email/username
- password_hash
- role: owner | admin | staff | viewer
- status: active | disabled
- created_at

## 5.4 Plan
- id
- name
- durations: array of { days, price }
- seat_price (optional)
- limits (JSON)
- entitlements (JSON)

## 5.5 TenantSubscription (or TenantLicense)
- tenant_id
- plan_id
- license_start_at
- license_end_at
- grace_end_at (optional)
- payment_state: paid | unpaid | grace
- max_seats

## 5.6 Payment
- tenant_id
- subscription_id
- amount
- currency
- paid_at
- mode
- reference
- status

## 5.7 AuditLog
- id
- actor_master_admin_id
- tenant_id (nullable)
- action
- before (JSON)
- after (JSON)
- created_at

---

# 6) Enforcement Rules (What the app should block)

## 6.1 Access gate (every request)
- Resolve `tenant_id` from the authenticated **tenant user login** (not from business profile).
- If tenant is **suspended** => block
- If `now > license_end_at` and `now > grace_end_at` => block

## 6.2 UI behavior
- Show a clear screen:
  - “Your plan has expired. Renew to continue.”
  - “Your account is suspended. Contact support.”

## 6.3 API behavior
- Return consistent error codes:
  - `402 Payment Required` for expired plans (optional)
  - `403 Forbidden` for suspended

---

# 7) MVP Recommendation (Implement First)

## Phase 1 (Must-have)
- Tenants CRUD
- Plans CRUD (duration + amount)
- Assign plan to tenant
- License windows + expiration enforcement
- Per-user seat limit enforcement
- Basic audit logs

## Phase 2
- Entitlements per tenant
- Usage counters + quotas
- Renewals dashboard
- Payments records

## Phase 3
- Impersonation
- Broadcast messages
- Advanced analytics & alerts
