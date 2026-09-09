# UCIS COMPREHENSIVE FULL-STACK APPLICATION AUDIT

**Date:** September 9, 2026  
**Auditor:** MiMo Independent Security Review  
**Scope:** Full application codebase (33 TS/TSX files, 34 SQL migrations, 27 routes)  
**Mode:** READ-ONLY AUDIT — No modifications made

---

# 1. EXECUTIVE AUDIT VERDICT

**APPLICATION STATUS: BLOCKED**

The UCIS application has a **fundamental architectural flaw**: every page uses `'use client'` with client-side Supabase queries. There are **ZERO server components performing authorization**, **ZERO server actions**, and **ZERO server-side role/permission checks on any page**. The sidebar is a client-side UI control that provides no security. Any authenticated user can navigate to any route by typing the URL directly.

While the database has comprehensive RLS policies, the application layer provides **no defense-in-depth**. If any RLS policy has a gap, the application will not catch it. The database is the ONLY security boundary, and several RLS policies have gaps.

---

# 2. APPLICATION ARCHITECTURE MAP

```
src/
├── middleware.ts                    # Auth check only (not role-based)
├── lib/
│   ├── auth.ts                     # Client-side auth helpers (signIn, signUp, signOut, hasRole, hasPermission)
│   ├── utils.ts                    # Utility functions (cn, formatDate, getStatusColor)
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (UNUSED by any page)
│   │   └── middleware.ts           # Session refresh + auth redirect
│   └── types/
│       └── database.ts             # TypeScript interfaces
├── app/
│   ├── page.tsx                    # Landing page (public)
│   ├── layout.tsx                  # Root layout
│   ├── auth/
│   │   ├── login/page.tsx          # Login form
│   │   └── register/page.tsx       # Registration form
│   ├── setup/
│   │   └── page.tsx                # Superadmin setup
│   ├── api/
│   │   └── setup/route.ts          # Superadmin creation API
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar navigation (CLIENT-SIDE ROLE CHECK)
│   │   └── page.tsx                # Dashboard stats
│   ├── admin/
│   │   ├── users/page.tsx          # User management
│   │   └── clinics/page.tsx        # Clinic management
│   ├── queue/page.tsx              # Queue management
│   ├── records/page.tsx            # Medical records
│   ├── dental/page.tsx             # Dental records + odontogram
│   ├── vitals/page.tsx             # Vital signs
│   ├── fbs/page.tsx                # FBS records
│   ├── prescriptions/page.tsx      # Prescriptions
│   ├── medicines/page.tsx          # Medicine inventory
│   ├── dispensing/page.tsx         # Pharmacy dispensing
│   ├── referrals/page.tsx          # Clinical referrals
│   ├── follow-ups/page.tsx         # Follow-up scheduling
│   ├── clearances/page.tsx         # Clearances/certificates
│   ├── incidents/page.tsx          # Incident reporting
│   ├── notifications/page.tsx      # Notification center
│   ├── reports/page.tsx            # Reports dashboard
│   └── patient/
│       ├── page.tsx                # Patient portal
│       └── register/page.tsx       # Patient registration
```

**Total routes:** 27 (including API route)  
**Server components:** 1 (landing page only)  
**Client components:** 26  
**Server actions:** 0  
**API routes:** 1 (setup only)

---

# 3. AUTHENTICATION AUDIT

## 3.1 Implementation

Authentication is implemented via Supabase Auth client-side:
- `src/lib/auth.ts` — `signIn()`, `signUp()`, `signOut()`, `hasRole()`, `hasPermission()`
- `src/lib/supabase/middleware.ts` — Session refresh, protected route redirect

## 3.2 Middleware

```typescript
// src/lib/supabase/middleware.ts
const protectedPaths = ['/dashboard', '/admin', '/doctor', '/dentist', '/nurse', '/clinic-staff', '/records', '/prescriptions', '/queue', '/patient', '/reports', '/vitals', '/fbs', '/dental', '/referrals', '/follow-ups', '/clearances', '/incidents', '/medicines', '/dispensing', '/notifications'];

if (isProtected && !user) {
  // Redirect to login
}
```

**Middleware only checks: Is the user logged in?**  
**Middleware does NOT check: What role does the user have?**

## 3.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| Auth-1 | HIGH | Middleware performs NO role-based access control. Any logged-in user can access any protected route. |
| Auth-2 | MEDIUM | `hasRole()` and `hasPermission()` in `src/lib/auth.ts` use `supabase.rpc()` which is correct (DB-backed), but they are NEVER called by any page. |
| Auth-3 | LOW | Registration allows self-assignment of any user_type (student, faculty, non_teaching_staff, walk_in). No verification of university affiliation. |

**Status: PARTIAL** — Authentication works, authorization is absent at the application layer.

---

# 4. RBAC AUDIT

## 4.1 Source of Truth

Roles and permissions are database-backed (Phase 33 seed data):
- 9 roles defined in `roles` table
- 35 permissions defined in `permissions` table
- Role-permission assignments in `role_permissions` table

## 4.2 Backend Functions

Phase 28 defines:
- `has_role(required_role)` — SECURITY DEFINER, queries `user_roles` table
- `has_permission(required_permission)` — SECURITY DEFINER, queries `role_permissions` table
- `get_user_profile_id()` — Gets profile ID from auth.uid()
- `is_provider_assigned_to_encounter()` — Checks provider assignment
- `validate_user_role()` — Validates user has specific role

**These functions are correctly implemented and DB-backed.**

## 4.3 Application Usage

**CRITICAL FINDING: None of these functions are called by any page.**

- `src/lib/auth.ts` defines `hasRole()` and `hasPermission()` which call `supabase.rpc('has_role', ...)` and `supabase.rpc('has_permission', ...)`
- **No page imports or calls `hasRole()` or `hasPermission()`**
- The sidebar uses a direct query to `user_roles` table (client-side) to determine navigation
- No page checks permissions before performing operations

## 4.4 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| RBAC-1 | **CRITICAL** | `has_role()` and `has_permission()` are defined but NEVER used by any page. Zero server-side authorization enforcement. |
| RBAC-2 | **CRITICAL** | Sidebar navigation is determined by client-side query to `user_roles`. User can manipulate DOM or navigate directly to bypass. |
| RBAC-3 | HIGH | No page checks if the current user has the required role before displaying forms or performing mutations. |

**Status: FAILED** — RBAC functions exist in the database but are completely unwired in the application.

---

# 5. PERMISSION AUDIT

## 5.1 Permission Matrix (from Phase 33)

| Role | System Permissions | Clinical Permissions | Patient Permissions |
|------|-------------------|---------------------|---------------------|
| super_admin | system.configure, roles.manage, users.manage, audit_logs.view, reports.export | NONE | NONE |
| admin | users.manage, clinics.manage, inventory.manage, announcements.manage, reports.view, audit_logs.view | NONE | NONE |
| doctor | NONE | medical_records.*, prescriptions.create/view, referrals.create, clearances.create, fbs_records.view | NONE |
| dentist | NONE | dental_records.*, odontograms.*, referrals.create, clearances.create | NONE |
| nurse | NONE | fbs_records.view/create, vitals.view/create, queue.view, patients.view | NONE |
| clinic_staff | NONE | queue.manage, patients.register, documents.manage, inventory.manage, prescriptions.dispense | NONE |
| student | NONE | NONE | medical_records.view, dental_records.view, fbs_records.view, prescriptions.view, clearances.create |
| faculty | NONE | NONE | medical_records.view, dental_records.view, fbs_records.view, prescriptions.view, clearances.create |
| non_teaching_staff | NONE | NONE | medical_records.view, dental_records.view, fbs_records.view, prescriptions.view, clearances.create |

## 5.2 Application Enforcement

**NONE.** Permissions are not checked anywhere in the application code.

## 5.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| PERM-1 | **CRITICAL** | Permission checks are not implemented in the application. Any authenticated user can perform any operation that RLS allows. |
| PERM-2 | HIGH | The `admin` role has NO clinical permissions per the seed data, but the application has no check preventing an admin from accessing clinical pages (they just need to navigate directly). |

**Status: FAILED** — Permissions exist in the database but are not enforced by the application.

---

# 6. ROLE → SIDEBAR MATRIX

| Menu Item | Route | SUPER_ADMIN | ADMIN | DOCTOR | DENTIST | NURSE | STAFF | PATIENT |
|-----------|-------|-------------|-------|--------|---------|-------|-------|---------|
| Dashboard | /dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users | /admin/users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Clinics | /admin/clinics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Queue | /queue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Medicines | /medicines | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dispensing | /dispensing | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reports | /reports | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Records | /records | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dental | /dental | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Prescriptions | /prescriptions | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Vitals | /vitals | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| FBS | /fbs | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Referrals | /referrals | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Follow-ups | /follow-ups | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Clearances | /clearances | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Incidents | /incidents | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Register | /patient/register | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Notifications | /notifications | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| My Portal | /patient | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 6.1 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| SID-1 | **CRITICAL** | Sidebar is CLIENT-SIDE ONLY. A student can type `/admin/users` in the URL and the page loads. The sidebar hides menu items but does NOT prevent access. |
| SID-2 | HIGH | Multi-role users (e.g., ADMIN + DOCTOR) get ONLY the first matching role's sidebar. The `getNavItems()` function uses `if/else` and returns the FIRST match. ADMIN + DOCTOR sees admin nav only, missing clinical pages. |
| SID-3 | HIGH | DOCTOR sidebar shows "Dental" link. Per the spec, doctors should NOT access dental records. The sidebar allows doctors to see dental pages. |
| SID-4 | MEDIUM | No "My Portal" link for patients with roles (e.g., student who is also a patient). The patient nav is only shown when NO other role matches. |

**Status: FAILED** — Sidebar is a UI control, not a security boundary.

---

# 7. ROUTE AUTHORIZATION MATRIX

| Route | Auth Required | Role Check | Permission Check | Server Auth | RLS | Actual Security |
|-------|--------------|------------|------------------|-------------|-----|-----------------|
| / | No | No | No | No | N/A | Public |
| /auth/login | No | No | No | No | N/A | Public |
| /auth/register | No | No | No | No | N/A | Public |
| /setup | No | No | No | No | N/A | **CRITICAL: Publicly accessible** |
| /api/setup | No | No | No | No | N/A | **CRITICAL: Publicly accessible POST** |
| /dashboard | Yes (middleware) | No | No | No | Varies | RLS only |
| /admin/users | Yes (middleware) | No | No | No | user_profiles RLS | RLS only |
| /admin/clinics | Yes (middleware) | No | No | No | clinics RLS | RLS only |
| /queue | Yes (middleware) | No | No | No | queue_entries RLS | RLS only |
| /records | Yes (middleware) | No | No | No | medical_records RLS | RLS only |
| /dental | Yes (middleware) | No | No | No | dental_records RLS | RLS only |
| /vitals | Yes (middleware) | No | No | No | vital_signs RLS | RLS only |
| /fbs | Yes (middleware) | No | No | No | fbs_records RLS | RLS only |
| /prescriptions | Yes (middleware) | No | No | No | prescriptions RLS | RLS only |
| /medicines | Yes (middleware) | No | No | No | medicines RLS | RLS only |
| /dispensing | Yes (middleware) | No | No | No | dispensing RLS | RLS only |
| /referrals | Yes (middleware) | No | No | No | clinical_referrals RLS | RLS only |
| /follow-ups | Yes (middleware) | No | No | No | follow_ups RLS | RLS only |
| /clearances | Yes (middleware) | No | No | No | clearances RLS | RLS only |
| /incidents | Yes (middleware) | No | No | No | incidents RLS | RLS only |
| /notifications | Yes (middleware) | No | No | No | notifications RLS | RLS only |
| /reports | Yes (middleware) | No | No | No | audit_logs RLS | RLS only |
| /patient | Yes (middleware) | No | No | No | patient_profiles RLS | RLS only |
| /patient/register | Yes (middleware) | No | No | No | patient_profiles RLS | RLS only |

## 7.1 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| ROUTE-1 | **CRITICAL** | `/setup` and `/api/setup` are NOT in the protected paths list. Any unauthenticated user can access them and create a superadmin account. |
| ROUTE-2 | **CRITICAL** | ALL routes rely solely on RLS for authorization. No server-side role/permission check exists on any route. |
| ROUTE-3 | HIGH | No page uses the `server.ts` Supabase client or `requireAuth()`/`requireRole()` functions. These are defined but UNUSED. |

**Status: FAILED** — Route protection is authentication-only, not authorization.

---

# 8. FRONTEND → SERVER ACTION WIRING AUDIT

## 8.1 Server Actions

**COUNT: 0**

There are ZERO `"use server"` files in the entire codebase.

## 8.2 All Mutations

Every mutation is performed directly from client components via `supabase.from().insert/update/delete()`:

| Page | Mutation | Client Call | Server Action | Authorization | Status |
|------|----------|-------------|---------------|---------------|--------|
| queue/page.tsx | Update queue status | `supabase.from('queue_entries').update()` | None | RLS only | UNWIRED |
| records/page.tsx | None (read-only) | N/A | None | N/A | READ-ONLY |
| prescriptions/page.tsx | Create prescription | `supabase.from('prescriptions').insert()` | None | RLS only | UNWIRED |
| vitals/page.tsx | Record vitals | `supabase.from('vital_signs').insert()` | None | RLS only | UNWIRED |
| dental/page.tsx | None (read-only) | N/A | None | N/A | READ-ONLY |
| fbs/page.tsx | Record FBS | `supabase.from('fbs_records').insert()` | None | RLS only | UNWIRED |
| referrals/page.tsx | Create referral | `supabase.from('clinical_referrals').insert()` | None | RLS only | UNWIRED |
| follow-ups/page.tsx | Create/complete follow-up | `supabase.from('follow_ups').insert/update()` | None | RLS only | UNWIRED |
| clearances/page.tsx | Issue/revoke clearance | `supabase.from('clearances').insert/update()` | None | RLS only | UNWIRED |
| incidents/page.tsx | Report incident | `supabase.from('incidents').insert()` | None | RLS only | UNWIRED |
| medicines/page.tsx | Add medicine | `supabase.from('medicines').insert()` | None | RLS only | UNWIRED |
| dispensing/page.tsx | Dispense medication | `supabase.from('dispensing').insert()` + `supabase.from('prescriptions').update()` | None | RLS only | UNWIRED |
| notifications/page.tsx | Mark read/delete | `supabase.from('notifications').update/delete()` | None | RLS only | UNWIRED |
| admin/users/page.tsx | None (read-only) | N/A | None | N/A | READ-ONLY |
| patient/register/page.tsx | Register patient + add to queue | `supabase.from('patient_profiles').insert()` + `supabase.from('queue_entries').insert()` | None | RLS only | UNWIRED |
| auth/register/page.tsx | Create user + profile + role | `supabase.auth.signUp()` + `supabase.from('user_profiles').insert()` + `supabase.from('user_roles').insert()` | None | RLS only | UNWIRED |

## 8.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| WIRE-1 | **CRITICAL** | Zero server actions exist. All mutations are client-side Supabase calls with no server-side authorization, validation, or audit. |
| WIRE-2 | HIGH | Registration page inserts into `user_roles` directly from the client. A user could potentially assign themselves admin roles by manipulating the form data. |
| WIRE-3 | HIGH | Patient registration inserts into `patient_profiles` from the client. No server-side validation of data integrity. |
| WIRE-4 | MEDIUM | Dispensing page updates prescription status from `active` to `dispensed` directly. No transaction boundary, no stock verification, no audit logging. |

**Status: FAILED** — No server-side wiring exists.

---

# 9. API ROUTE AUDIT

## 9.1 `/api/setup` (POST)

| Attribute | Value |
|-----------|-------|
| Method | POST |
| Authentication | NONE |
| Authorization | NONE |
| Permission | NONE |
| Scope | NONE |
| RLS | Bypassed (service_role) |
| Audit | NONE |
| Status | **CRITICAL** |

**This endpoint creates a superadmin account with no authentication.** Anyone who can reach this endpoint can create an admin account.

## 9.2 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| API-1 | **CRITICAL** | `/api/setup` has no authentication or authorization. It uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. Any unauthenticated user can create a superadmin. |
| API-2 | HIGH | The setup endpoint should be removed after initial setup or protected by a one-time token. |

**Status: FAILED** — The only API route is critically insecure.

---

# 10. DASHBOARD AUDIT

## 10.1 Implementation

`src/app/dashboard/page.tsx` queries:
1. `patient_profiles` — count (all patients)
2. `encounters` — count (today's encounters)
3. `queue_entries` — count (waiting today)
4. `prescriptions` — count (active)
5. `audit_logs` — last 10 entries

## 10.2 Role-Based Behavior

**NONE.** The dashboard is identical for all roles. A student sees the same dashboard as a super_admin.

## 10.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| DASH-1 | **CRITICAL** | Dashboard queries `audit_logs` and shows them to ALL users. A student can see system audit logs. |
| DASH-2 | HIGH | Dashboard queries `patient_profiles` count. While RLS may limit actual data, the count itself may leak information. |
| DASH-3 | HIGH | Dashboard is not role-specific. Doctor should see assigned encounters, nurse should see triage queue, etc. |
| DASH-4 | MEDIUM | Dashboard uses client-side queries. RLS is the only protection against unauthorized data access. |

**Status: FAILED** — Dashboard is not role-appropriate and leaks audit data.

---

# 11. SIDEBAR SECURITY AUDIT

## 11.1 Implementation

```typescript
// src/app/dashboard/layout.tsx
const getNavItems = (): NavItem[] => {
  if (roles.includes('super_admin') || roles.includes('admin')) {
    return adminNav;
  }
  if (roles.includes('doctor')) {
    return doctorNav;
  }
  // ...
};
```

Roles are fetched client-side:
```typescript
const { data: rolesData } = await supabase
  .from('user_roles')
  .select('roles(name)')
  .eq('user_id', user.id)
  .eq('is_active', true);
```

## 11.2 Security Analysis

The sidebar is a **client-side UI control**. It:
- ✅ Shows different menus based on role
- ❌ Does NOT prevent direct URL access
- ❌ Does NOT perform server-side authorization
- ❌ Can be bypassed by typing the URL directly
- ❌ Can be manipulated via browser DevTools

## 11.3 Direct URL Access Test

| URL | Expected (by role) | Actual (any logged-in user) | Result |
|-----|--------------------|-----------------------------|--------|
| /admin/users | Admin only | ACCESSIBLE to all | **FAIL** |
| /admin/clinics | Admin only | ACCESSIBLE to all | **FAIL** |
| /records | Doctor only | ACCESSIBLE to all | **FAIL** |
| /dental | Dentist only | ACCESSIBLE to all | **FAIL** |
| /vitals | Nurse only | ACCESSIBLE to all | **FAIL** |
| /prescriptions | Doctor only | ACCESSIBLE to all | **FAIL** |
| /dispensing | Clinic Staff only | ACCESSIBLE to all | **FAIL** |
| /clearances | Doctor/Dentist/Staff | ACCESSIBLE to all | **FAIL** |
| /reports | Admin only | ACCESSIBLE to all | **FAIL** |
| /medicines | Admin only | ACCESSIBLE to all | **FAIL** |

**Note:** RLS may prevent DATA access, but the PAGES load for any authenticated user.

## 11.4 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| SEC-1 | **CRITICAL** | Sidebar is the ONLY authorization control. It provides ZERO security. Any authenticated user can access any route. |
| SEC-2 | HIGH | Multi-role handling is incorrect. First-match wins in `if/else` chain. ADMIN + DOCTOR sees admin nav only. |

**Status: FAILED** — Sidebar is UI, not security.

---

# 12. SUPABASE RLS AUDIT

## 12.1 RLS Enablement (Phase 31)

RLS is enabled on 42 tables. This is correct.

## 12.2 Key RLS Policies (Phase 32)

### user_profiles
- SELECT: `auth.uid() = auth_user_id` ✅
- INSERT: `auth.uid() = auth_user_id` ✅
- UPDATE: `auth.uid() = auth_user_id` ✅

### patient_profiles
- SELECT: Patient can read own; providers can read patients in encounters ✅
- INSERT: Authenticated users can create ⚠️ (no role check)
- UPDATE: Patient can update own; providers can update in encounters ✅

### medical_records
- SELECT: Providers can read for their encounters; patients can read own ✅
- INSERT: Providers can insert for their encounters ✅
- UPDATE: Providers can update own (not finalized) ✅

### dental_records
- SELECT: Dentists can read for their encounters; patients can read own ✅
- INSERT: Dentists can insert for their encounters ✅
- UPDATE: Dentists can update own (not finalized) ✅

### queue_entries
- SELECT: All authenticated users ⚠️ (no clinic scoping)
- INSERT: All authenticated users ⚠️ (no role check)
- UPDATE: All authenticated users ⚠️ (no role check)

### prescriptions
- SELECT: Providers can see own; patients can see own ✅
- INSERT: Doctors/nurses/admins can insert ⚠️ (admin can insert prescriptions)
- UPDATE: Providers can update own ✅

### audit_logs
- SELECT: Users can read own entries ✅
- INSERT: Only through SECURITY DEFINER functions ✅
- UPDATE/DELETE: Prevented by triggers ✅

### notifications
- SELECT: Users can see own ✅
- INSERT: `WITH CHECK (TRUE)` ⚠️ **CRITICAL: Any user can insert notifications for ANY user**
- UPDATE: Users can update own ✅

### clearances
- SELECT: Providers can see own; patients can see own ✅
- INSERT: Providers can insert ✅
- UPDATE: Providers can update own ✅

### dispensing
- No explicit RLS policy found ⚠️ (relies on default deny or SECURITY DEFINER)

## 12.3 RLS Contradictions

| Finding | Severity | Description |
|---------|----------|-------------|
| RLS-1 | **CRITICAL** | `notifications` INSERT policy uses `WITH CHECK (TRUE)`. Any authenticated user can create notifications for any user_id. |
| RLS-2 | HIGH | `queue_entries` policies allow ALL authenticated users to INSERT/UPDATE. No clinic/service scoping. Any user can manipulate any clinic's queue. |
| RLS-3 | HIGH | `prescriptions` INSERT allows `admin` and `super_admin` roles to insert. Per spec, ADMIN should NOT have clinical permissions. |
| RLS-4 | MEDIUM | `patient_profiles` INSERT allows any authenticated user to create patient profiles. No role verification. |
| RLS-5 | MEDIUM | `medicines` has no explicit INSERT/UPDATE policy. May be locked down by default deny, but the medicines page attempts direct inserts. |

**Status: PARTIAL** — RLS provides a baseline but has gaps.

---

# 13. IDOR AUDIT

## 13.1 Patient Isolation

The RLS policies for `medical_records`, `dental_records`, `prescriptions`, etc. use:
```sql
patient_id IN (
  SELECT pp.id FROM patient_profiles pp
  WHERE pp.user_profile_id = get_user_profile_id()
)
```

This correctly isolates patients to their own records.

## 13.2 Provider Isolation

Medical records SELECT uses:
```sql
encounter_id IN (
  SELECT e.id FROM encounters e
  WHERE e.provider_id = get_user_profile_id()
)
```

This correctly limits providers to their assigned encounters.

## 13.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| IDOR-1 | MEDIUM | No application-level IDOR checks. All protection relies on RLS. If RLS has gaps, IDOR is possible. |
| IDOR-2 | LOW | Patient registration page allows searching patients by name/email. RLS should protect, but no server-side check exists. |

**Status: PARTIALLY PROVEN** — RLS provides IDOR protection, but no defense-in-depth.

---

# 14. CROSS-SPECIALTY SECURITY

## 14.1 Doctor → Dental Records

RLS policy for `dental_records`:
```sql
provider_type = 'dentist'
```

This correctly blocks doctors from accessing dental records.

## 14.2 Dentist → Medical Records

RLS policy for `medical_records`:
```sql
provider_type = 'doctor'
```

This correctly blocks dentists from accessing medical records.

## 14.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| XSPEC-1 | LOW | Cross-specialty isolation is enforced at the RLS level. However, the DOCTOR sidebar shows a "Dental" link, which is misleading. |

**Status: PROVEN** (at RLS level) — Cross-specialty isolation works via RLS.

---

# 15. NURSE SECURITY

## 15.1 Implementation

Nurse access is scoped via:
- `vital_signs` — INSERT/SELECT for authenticated users
- `fbs_records` — INSERT/SELECT for authenticated users
- `care_team_members` — Table exists but no RLS policy found

## 15.2 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| NURSE-1 | HIGH | No RLS policy found for `care_team_members`. Nurse care-team scoping may not be enforced. |
| NURSE-2 | MEDIUM | `vital_signs` and `fbs_records` INSERT policies allow all authenticated users, not just nurses. |

**Status: NOT PROVEN** — Nurse care-team scoping is not enforced at the application level.

---

# 16. CLINICAL RECORD IMMUTABILITY

## 16.1 Database Triggers (Phase 30)

- `prevent_medical_finalized_update` — Blocks UPDATE on finalized medical records ✅
- `prevent_dental_finalized_update` — Blocks UPDATE on finalized dental records ✅
- `prevent_audit_update` — Blocks UPDATE on audit_logs ✅
- `prevent_audit_delete` — Blocks DELETE on audit_logs ✅

## 16.2 Application-Level

No application-level checks for finalization status. All protection is at the database level.

## 16.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| IMMUT-1 | MEDIUM | Immutability is enforced by database triggers, not application code. This is acceptable but provides no defense-in-depth. |

**Status: PROVEN** (at database level) — Finalized records cannot be modified.

---

# 17. AUDIT LOGGING

## 17.1 Database Function

`write_audit_log()` is a SECURITY DEFINER function that:
- Validates actor exists
- Validates action is not empty
- Inserts with server-controlled timestamps
- Is the ONLY way to insert into audit_logs (RLS INSERT policy)

## 17.2 Application Usage

**The `write_audit_log()` function is NEVER called by the application.**

No page, no API route, no server action calls `write_audit_log()`.

## 17.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| AUDIT-1 | **CRITICAL** | Audit logging is implemented in the database but NEVER used by the application. No clinical operation is audited. |
| AUDIT-2 | HIGH | Login/logout events are not audited by the application. |

**Status: FAILED** — Audit logging exists but is completely unwired.

---

# 18. PHARMACY INTEGRITY

## 18.1 Dispensing Implementation

`dispensing/page.tsx`:
1. Fetches active prescriptions
2. User enters quantity and batch number
3. Calls `supabase.from('dispensing').insert()`
4. Calls `supabase.from('prescriptions').update({ status: 'dispensed' })`

## 18.2 Database Function

`dispense_prescription()` in Phase 29:
- Uses `FOR UPDATE` row locking
- Verifies prescription status
- Verifies batch availability
- Verifies expiration
- Deducts stock atomically
- Records dispensing

## 18.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| PHARM-1 | **CRITICAL** | The dispensing page does NOT use the `dispense_prescription()` function. It performs two separate client-side calls with no transaction boundary, no row locking, no stock verification, no expiry check. |
| PHARM-2 | HIGH | Race condition: Two users can simultaneously dispense the last unit of a batch. |
| PHARM-3 | HIGH | No negative stock prevention at the application level. |
| PHARM-4 | MEDIUM | No audit logging for dispensing operations. |

**Status: FAILED** — Pharmacy dispensing bypasses the transactional database function.

---

# 19. DOCUMENT/QR AUDIT

## 19.1 QR Verification

`verify_public_document()` in Phase 29:
- Takes verification_token
- Returns only document_type, issued_at, status
- Does NOT return patient name, ID, diagnosis, or clinical data
- Logs verification attempts

## 19.2 Application Usage

**The QR verification function is NEVER called by the application.** No verification page exists.

## 19.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| QR-1 | MEDIUM | QR verification is implemented in the database but has no frontend. |
| QR-2 | LOW | The verification function correctly returns minimal data. |

**Status: DOCUMENTED ONLY** — QR verification exists in DB but no UI.

---

# 20. BREAK-GLASS ACCESS

## 20.1 Database Function

`grant_break_glass_access()` in Phase 29:
- Requires recipient to have DOCTOR/DENTIST/NURSE role
- Rejects self-grants
- Requires structured reason code
- Sets expiry (default 4 hours)
- Logs to audit trail
- Notifies super_admins

## 20.2 Application Usage

**The break-glass function is NEVER called by the application.** No break-glass UI exists.

## 20.3 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| BG-1 | MEDIUM | Break-glass is implemented in the database but has no frontend. |

**Status: DOCUMENTED ONLY** — Break-glass exists in DB but no UI.

---

# 21. SEARCH SECURITY

## 21.1 Patient Search

`patient/register/page.tsx` searches:
```typescript
const { data } = await supabase
  .from('patient_profiles')
  .select('*')
  .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
  .limit(10);
```

## 21.2 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| SEARCH-1 | MEDIUM | Patient search is client-side. RLS should protect, but any authenticated user can search all patients. |
| SEARCH-2 | LOW | No rate limiting on search queries. |

**Status: PARTIALLY PROVEN** — Search relies on RLS for authorization.

---

# 22. CACHE/SESSION SECURITY

## 22.1 Implementation

- No `revalidatePath` or `revalidateTag` calls
- No SWR or React Query
- `router.refresh()` called after login
- Client-side state management with `useState`

## 22.2 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| CACHE-1 | MEDIUM | No cache invalidation after role changes. If a user's role is revoked, stale sidebar may still show elevated menus until page refresh. |
| CACHE-2 | LOW | No `router.refresh()` after mutations. Data may be stale. |

**Status: PARTIAL** — No sophisticated caching, but no active cache poisoning risk.

---

# 23. ERROR HANDLING

## 23.1 Implementation

All pages use `try/catch` with `toast.error()` for error display.

## 23.2 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| ERR-1 | MEDIUM | Some pages use `console.error()` instead of `toast.error()` (e.g., records/page.tsx). |
| ERR-2 | LOW | Error messages from Supabase are displayed directly to users. May leak internal details. |

**Status: PARTIAL** — Basic error handling exists but is inconsistent.

---

# 24. BROKEN/ORPHANED FEATURES

## 24.1 Server-Side Functions Never Used

| Function | File | Used By App? |
|----------|------|-------------|
| `has_role()` | Phase 28 | ❌ NEVER |
| `has_permission()` | Phase 28 | ❌ NEVER |
| `is_provider_assigned_to_encounter()` | Phase 28 | ❌ NEVER |
| `write_audit_log()` | Phase 29 | ❌ NEVER |
| `log_phi_read()` | Phase 29 | ❌ NEVER |
| `verify_public_document()` | Phase 29 | ❌ NEVER |
| `generate_document_control_number()` | Phase 29 | ❌ NEVER |
| `create_queue_entry()` | Phase 29 | ❌ NEVER |
| `dispense_prescription()` | Phase 29 | ❌ NEVER |
| `grant_break_glass_access()` | Phase 29 | ❌ NEVER |
| `revoke_break_glass_access()` | Phase 29 | ❌ NEVER |
| `requireAuth()` | src/lib/supabase/server.ts | ❌ NEVER |
| `requireRole()` | src/lib/supabase/server.ts | ❌ NEVER |
| `getUser()` (server) | src/lib/supabase/server.ts | ❌ NEVER |
| `hasRole()` (client) | src/lib/auth.ts | ❌ NEVER |
| `hasPermission()` (client) | src/lib/auth.ts | ❌ NEVER |

## 24.2 Pages Without Backend Authorization

**ALL 26 client-side pages** — Every page performs direct Supabase client calls with no server-side authorization.

## 24.3 Features Without Frontend

| Feature | Database Implementation | Frontend |
|---------|----------------------|----------|
| QR Verification | `verify_public_document()` | ❌ None |
| Break-Glass Access | `grant_break_glass_access()` | ❌ None |
| Audit Logging | `write_audit_log()` | ❌ None |
| PHI Read Logging | `log_phi_read()` | ❌ None |
| Document Control Numbers | `generate_document_control_number()` | ❌ None (clearances page generates locally) |
| Queue Entry Creation | `create_queue_entry()` | ❌ None (queue page uses direct insert) |
| Transactional Dispensing | `dispense_prescription()` | ❌ None (dispensing page uses direct calls) |

---

# 25. SECURITY TESTS (Phase 34)

Phase 34 contains 16 `DO` blocks that are **ALL STUBS**:

```sql
-- Example from Phase 34:
DO $$
BEGIN
  RAISE NOTICE 'TEST: Patient isolation - Patient A cannot access Patient B records';
  -- No actual assertions
END $$;
```

**No actual security tests are executed.** All test blocks are placeholder `RAISE NOTICE` statements with no `ASSERT` or actual verification.

## 25.1 Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| TEST-1 | HIGH | Security tests are stubs with no actual assertions. No automated security verification exists. |

**Status: NOT PROVEN** — Security tests are placeholders.

---

# 26. MASTER APPLICATION WIRING MATRIX

| Module | Page | Component | Action | Server Action/API | Supabase Query | DB Table | RLS | Permission | Role | Scope | Status |
|--------|------|-----------|--------|-------------------|----------------|----------|-----|------------|------|-------|--------|
| Auth | login/page.tsx | LoginForm | signInWithPassword | None (client) | supabase.auth | auth.users | N/A | None | None | None | PARTIAL |
| Auth | register/page.tsx | RegisterForm | signUp + insert | None (client) | supabase.auth + insert | user_profiles, user_roles | Yes | None | None | None | UNWIRED |
| Setup | setup/page.tsx | SetupForm | fetch('/api/setup') | /api/setup (POST) | admin.createUser | auth.users | Bypassed | None | None | None | **CRITICAL** |
| Dashboard | dashboard/page.tsx | DashboardPage | useEffect load | None (client) | select | patient_profiles, encounters, queue_entries, prescriptions, audit_logs | Yes | None | None | None | UNWIRED |
| Admin | admin/users/page.tsx | AdminUsersPage | useEffect load | None (client) | select | user_profiles, user_roles | Yes | None | None | None | UNWIRED |
| Admin | admin/clinics/page.tsx | AdminClinicsPage | useEffect load | None (client) | select | clinics, clinic_services | Yes | None | None | None | UNWIRED |
| Queue | queue/page.tsx | QueuePage | update queue_entries | None (client) | update | queue_entries | Yes | None | None | None | UNWIRED |
| Records | records/page.tsx | RecordsPage | useEffect load | None (client) | select | medical_records | Yes | None | None | None | UNWIRED |
| Dental | dental/page.tsx | DentalPage | useEffect load | None (client) | select | dental_records, odontograms | Yes | None | None | None | UNWIRED |
| Vitals | vitals/page.tsx | VitalsPage | insert vital_signs | None (client) | insert | vital_signs | Yes | None | None | None | UNWIRED |
| FBS | fbs/page.tsx | FBSPage | insert fbs_records | None (client) | insert | fbs_records | Yes | None | None | None | UNWIRED |
| Prescriptions | prescriptions/page.tsx | PrescriptionsPage | insert prescriptions | None (client) | insert | prescriptions | Yes | None | None | None | UNWIRED |
| Medicines | medicines/page.tsx | MedicinesPage | insert medicines | None (client) | insert | medicines | Yes? | None | None | None | UNWIRED |
| Dispensing | dispensing/page.tsx | DispensingPage | insert dispensing + update prescriptions | None (client) | insert + update | dispensing, prescriptions | Yes | None | None | None | UNWIRED |
| Referrals | referrals/page.tsx | ReferralsPage | insert clinical_referrals | None (client) | insert | clinical_referrals | Yes | None | None | None | UNWIRED |
| Follow-ups | follow-ups/page.tsx | FollowUpsPage | insert/update follow_ups | None (client) | insert/update | follow_ups | Yes | None | None | None | UNWIRED |
| Clearances | clearances/page.tsx | ClearancesPage | insert/update clearances | None (client) | insert/update | clearances | Yes | None | None | None | UNWIRED |
| Incidents | incidents/page.tsx | IncidentsPage | insert incidents | None (client) | insert | incidents | Yes | None | None | None | UNWIRED |
| Notifications | notifications/page.tsx | NotificationsPage | update/delete notifications | None (client) | update/delete | notifications | Yes | None | None | None | UNWIRED |
| Reports | reports/page.tsx | ReportsPage | useEffect load | None (client) | select | patient_profiles, encounters, audit_logs | Yes | None | None | None | UNWIRED |
| Patient | patient/page.tsx | PatientPortal | useEffect load | None (client) | select | patient_profiles, encounters, prescriptions, queue_entries | Yes | None | None | None | UNWIRED |
| Patient | patient/register/page.tsx | PatientRegister | insert patient_profiles + queue_entries | None (client) | insert | patient_profiles, queue_entries | Yes | None | None | None | UNWIRED |

---

# 27. SECURITY FINDINGS SUMMARY

## CRITICAL (7)

| # | Finding | Description |
|---|---------|-------------|
| C-1 | No Server-Side Authorization | ZERO server components, ZERO server actions, ZERO server-side role checks. All 26 pages are client-only. |
| C-2 | Sidebar is UI Only | Sidebar navigation is a client-side control. Any authenticated user can access any route by URL. |
| C-3 | RBAC Functions Unwired | `has_role()`, `has_permission()`, `is_provider_assigned_to_encounter()` exist in DB but are NEVER called. |
| C-4 | Audit Logging Unwired | `write_audit_log()` exists but is NEVER called. No operation is audited. |
| C-5 | Setup Endpoint Public | `/api/setup` creates superadmin with no authentication. |
| C-6 | Notifications INSERT Bypass | `notifications` RLS INSERT policy is `WITH CHECK (TRUE)`. Any user can insert for any user. |
| C-7 | Dispensing Bypasses Transaction | Dispensing page uses two separate client calls instead of the atomic `dispense_prescription()` function. |

## HIGH (9)

| # | Finding | Description |
|---|---------|-------------|
| H-1 | Middleware No Role Check | Middleware only checks authentication, not authorization. |
| H-2 | Dashboard Over-Fetches | Dashboard shows audit_logs to all users. |
| H-3 | Multi-Role Sidebar Wrong | First-match sidebar logic. ADMIN+DOCTOR sees admin nav only. |
| H-4 | Queue Entries No Scoping | Any authenticated user can manipulate any clinic's queue. |
| H-5 | Doctor Sidebar Shows Dental | Doctors see "Dental" link in sidebar (should be dentist-only). |
| H-6 | Prescriptions Admin Can Insert | RLS allows admin role to insert prescriptions (violates ADMIN≠CLINICAL). |
| H-7 | Registration Role Self-Assignment | Registration page inserts into user_roles from client. |
| H-8 | Security Tests Are Stubs | Phase 34 test blocks have no actual assertions. |
| H-9 | No Server Components Used | `server.ts` client and `requireAuth()`/`requireRole()` are defined but never imported. |

## MEDIUM (11)

| # | Finding | Description |
|---|---------|-------------|
| M-1 | Patient Profiles Open Insert | Any authenticated user can create patient profiles. |
| M-2 | medicines INSERT May Fail | No explicit INSERT policy for medicines table. |
| M-3 | No Cache Invalidation | Role changes don't invalidate cached sidebar. |
| M-4 | Search No Rate Limiting | Patient search has no rate limiting. |
| M-5 | Error Messages Leak Details | Supabase error messages shown to users. |
| M-6 | console.error Instead of toast | Inconsistent error handling. |
| M-7 | No QR Verification UI | QR verification exists in DB but no frontend. |
| M-8 | No Break-Glass UI | Break-glass exists in DB but no frontend. |
| M-9 | No PHI Read Logging | `log_phi_read()` never called. |
| M-10 | Duplicate RLS Enablement | `document_sequences` ENABLE ROW LEVEL SECURITY appears twice in Phase 31. |
| M-11 | Nurse Care-Team Not Enforced | No RLS policy for `care_team_members` table. |

## LOW (5)

| # | Finding | Description |
|---|---------|-------------|
| L-1 | Registration Self-Type | Users can self-select patient type without verification. |
| L-2 | Clearances Local Control Number | Control numbers generated locally, not via `generate_document_control_number()`. |
| L-3 | No PWA Setup | PWA manifest and service worker not implemented. |
| L-4 | Next.js 14.2.0 Outdated | Build warning about outdated Next.js version. |
| L-5 | Naming Inconsistency | Some pages use `patient_id` input field instead of resolving from auth. |

---

# 28. UNAUTHORIZED PHI PATHS

| Path | Risk | Description |
|------|------|-------------|
| /dashboard → audit_logs | HIGH | Any user can see audit log entries |
| /reports → audit_logs | HIGH | Any user can see audit logs |
| /admin/users → user_profiles | MEDIUM | Any user can see all user profiles (RLS-dependent) |
| /records → medical_records | MEDIUM | Any user can see medical records (RLS-dependent) |
| /dental → dental_records | MEDIUM | Any user can see dental records (RLS-dependent) |
| Direct URL to any page | HIGH | Any authenticated user can load any page |

---

# 29. RBAC CONTRADICTIONS

| Contradiction | Description |
|---------------|-------------|
| App vs DB | DB has comprehensive RBAC. App has ZERO RBAC enforcement. |
| Sidebar vs Backend | Sidebar shows role-appropriate menus. Backend has no role checks. |
| has_role() defined but unused | Function exists, is correct, but is never called. |

---

# 30. REQUIRED FIXES BEFORE NEXT STAGE

## CRITICAL (Must Fix)

1. **Create Server Components or Server Actions for ALL mutations** — Every insert/update/delete must go through a server-side function that validates auth.uid(), role, permission, and scope.

2. **Add Server-Side Route Authorization** — Every protected route must check the user's role server-side before rendering. Use `requireAuth()` and `requireRole()` from `server.ts`.

3. **Wire Up RBAC Functions** — Call `has_role()` and `has_permission()` in server components/actions before performing sensitive operations.

4. **Wire Up Audit Logging** — Call `write_audit_log()` for all clinical operations (create, update, finalize, prescription, dispensing, clearance).

5. **Remove or Protect Setup Endpoint** — Either remove `/api/setup` after initial setup, or add authentication/authorization.

6. **Fix Notifications INSERT RLS** — Change `WITH CHECK (TRUE)` to `WITH CHECK (user_id = auth.uid())`.

7. **Use `dispense_prescription()` for Dispensing** — Replace client-side dispensing with the atomic database function.

## HIGH (Should Fix)

8. **Make Dashboard Role-Specific** — Show different data based on user role.

9. **Fix Multi-Role Sidebar** — Merge navigation items for users with multiple roles.

10. **Remove Doctor Access to Dental Pages** — Doctor sidebar should not show "Dental" link.

11. **Fix Admin Prescription Insert RLS** — Remove admin from prescriptions INSERT policy.

12. **Add Queue Entry Clinic Scoping** — RLS should scope queue entries by clinic assignment.

13. **Add Security Test Assertions** — Phase 34 tests should have actual `ASSERT` statements.

14. **Use Server Supabase Client** — Pages should use `server.ts` client for data fetching where possible.

## MEDIUM (Nice to Have)

15. Add QR verification frontend.
16. Add break-glass request frontend.
17. Add PWA manifest and service worker.
18. Add rate limiting to search.
19. Improve error handling consistency.
20. Add `care_team_members` RLS policy.

---

# 31. FINAL READINESS ASSESSMENT

The UCIS application has a **solid database foundation** with comprehensive:
- ✅ 49 tables with proper schema
- ✅ RLS enabled on 42 tables
- ✅ SECURITY DEFINER functions for sensitive operations
- ✅ Immutability triggers for finalized records
- ✅ Status transition validators
- ✅ Break-glass access model
- ✅ Audit logging infrastructure
- ✅ QR verification function

However, the **application layer is fundamentally incomplete**:
- ❌ Zero server-side authorization
- ❌ Zero server actions
- ❌ Zero server components (except landing page)
- ❌ RBAC functions defined but never used
- ❌ Audit logging defined but never used
- ❌ All mutations are client-side Supabase calls
- ❌ Sidebar is the only "authorization" (UI only)
- ❌ All pages accessible to any authenticated user
- ✅ RLS provides a baseline security boundary (with gaps)

**The application is NOT ready for production or further development without first implementing server-side authorization.**

==================================================
UCIS COMPREHENSIVE APPLICATION AUDIT GATE
=========================================

APPLICATION AUDIT STATUS: **BLOCKED**

APPLICATION WIRING: **FAIL**
FRONTEND IMPLEMENTATION: **PARTIAL**
FRONTEND WIRING: **FAIL**
SERVER ACTION IMPLEMENTATION: **FAIL** (0 server actions)
SERVER ACTION WIRING: **FAIL** (0 server actions)
API AUTHORIZATION: **FAIL**
FRONTEND ↔ SERVER CONSISTENCY: **FAIL**
SERVER ↔ DATABASE CONSISTENCY: **FAIL**

AUTHENTICATION: **PASS**
RBAC: **FAIL**
PERMISSIONS: **FAIL**
MULTI-ROLE SECURITY: **FAIL**

SIDEBAR AUTHORIZATION: **FAIL**
DASHBOARD AUTHORIZATION: **FAIL**
ROUTE AUTHORIZATION: **FAIL**

RLS: **PARTIAL**
SECURITY DEFINER: **PASS** (functions exist but are unwired)
PATIENT ISOLATION: **PARTIALLY PROVEN** (RLS only)
IDOR PROTECTION: **PARTIALLY PROVEN** (RLS only)

CLINICAL ROLE SEPARATION: **PARTIALLY PROVEN** (RLS only)
PROVIDER/CARE-TEAM SCOPE: **NOT PROVEN**
CLINICAL RECORD INTEGRITY: **PROVEN** (DB triggers)
PHARMACY INTEGRITY: **FAIL** (bypasses transactional function)
DOCUMENT/QR SECURITY: **PARTIALLY PROVEN** (DB only, no UI)
STORAGE SECURITY: **NOT PROVEN** (no storage usage)
AUDIT LOGGING: **FAIL** (defined but never used)
REALTIME SECURITY: **NOT PROVEN** (no realtime usage)

END-TO-END FEATURE COMPLETENESS: **FAIL**

FRONTEND FEATURES:
COMPLETE: 0
PARTIAL: 26
BROKEN: 0
MISSING: 7 (QR, Break-Glass, PHI Logging, etc.)

SERVER ACTIONS:
COMPLETE: 0
PARTIAL: 0
BROKEN: 0
ORPHANED: 0

UNWIRED FRONTEND ACTIONS: 26
UNWIRED SERVER ACTIONS: 0 (none exist)
FAKE/PLACEHOLDER ACTIONS: 0
AUTHORIZATION GAPS: 26 (all pages)
DATABASE WIRING GAPS: 11 (all DB functions)
IDOR GAPS: 0 (RLS-dependent)

CRITICAL FINDINGS: 7
HIGH FINDINGS: 9
MEDIUM FINDINGS: 11
LOW FINDINGS: 5

UNAUTHORIZED PHI PATHS:
- /dashboard (audit_logs visible to all)
- /reports (audit_logs visible to all)
- All pages accessible via direct URL

RBAC CONTRADICTIONS:
- DB has RBAC, App has ZERO RBAC enforcement
- has_role()/has_permission() defined but never called

PERMISSION CONTRADICTIONS:
- DB has 35 permissions, App checks NONE

SIDEBAR CONTRADICTIONS:
- Sidebar shows role-appropriate menus but provides NO security
- Multi-role users get wrong sidebar (first-match)

DASHBOARD CONTRADICTIONS:
- Dashboard is identical for all roles
- Shows audit_logs to all users

ROUTE AUTHORIZATION GAPS:
- ALL 26 routes have no server-side authorization
- /setup and /api/setup have no authentication

SERVER/API AUTHORIZATION GAPS:
- /api/setup uses service_role with no auth check

RLS GAPS:
- notifications INSERT: WITH CHECK (TRUE)
- queue_entries: No clinic scoping
- prescriptions: Admin can insert (violates ADMIN≠CLINICAL)

IDOR GAPS:
- None confirmed (RLS-dependent)

BROKEN APPLICATION WIRING:
- All 16 DB functions are unwired
- requireAuth()/requireRole() never called
- Server Supabase client never used

ORPHANED FEATURES:
- QR verification (DB only)
- Break-glass access (DB only)
- Audit logging (DB only)
- PHI read logging (DB only)
- Document control numbers (DB only)
- Queue entry creation function (DB only)
- Transactional dispensing (DB only)

FAKE/PLACEHOLDER FEATURES:
- Security tests (Phase 34) are all stubs

REQUIRED FIXES BEFORE NEXT STAGE:
1. Implement server-side authorization for ALL routes
2. Create server actions for ALL mutations
3. Wire up has_role()/has_permission() checks
4. Wire up write_audit_log() for all operations
5. Remove/protect /api/setup endpoint
6. Fix notifications INSERT RLS policy
7. Use dispense_prescription() for dispensing
8. Make dashboard role-specific
9. Fix multi-role sidebar
10. Add actual security test assertions

APPLICATION MODIFIED: NO
DATABASE MODIFIED: NO
PRODUCTION SQL GENERATED: NO
MIGRATIONS CREATED: NO

# HUMAN REVIEW REQUIRED: YES
