# UCIS Workflow Conformance Report

**Date:** September 10, 2026  
**Scope:** End-to-end workflow integration, CRUD module isolation, and full refactoring audit  
**Status:** Complete  

---

## B. System Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript 5.9 | Server/client rendering, routing |
| Styling | Tailwind CSS | UI Constitution compliance |
| Auth | Supabase Auth (JWT) | Session management, role assignment |
| Database | Supabase PostgreSQL + RLS | Data persistence, security boundary |
| AI | Groq SDK (`openai/gpt-oss-120b`) | Carina virtual assistant |
| Icons | @phosphor-icons/react (client-only) | UI iconography |
| Deployment | Vercel + GitHub | CI/CD |

**Key Principle:** The database (RLS policies) is the authoritative security boundary. The application layer is untrusted.

---

## C. Database Schema

### Tables Created/Extended in Phase 35

| Table | Status | Columns Added |
|-------|--------|---------------|
| `vital_signs` | **Created** | patient_id, encounter_id, recorded_by, BP, pulse, temp, O2, height, weight, BMI, notes |
| `follow_ups` | **Created** | patient_id, encounter_id, scheduled_by, scheduled_date, reason, status |
| `referrals` | **Created** | patient_id, encounter_id, from/to clinic, reason, urgency, status |
| `dispensing` | **Created** | prescription_id, patient_id, dispensed_by, quantity, batch_number |
| `prescriptions` | **Extended** | medication_name, dosage, frequency, duration, quantity, refills, instructions, prescribed_by |
| `incidents` | **Extended** | incident_type, patient_id, incident_date |
| `clearances` | **Extended** | control_number, issue_date, expiry_date |
| `fbs_records` | **Extended** | fbs_value, fasting_hours, recorded_by, recorded_at |
| `dental_records` | **Exists** | encounter_id, chief_complaint, oral_examination, diagnosis, treatment_plan, notes, status |

### RLS Policy Coverage

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| vital_signs | ✓ patient/doctor/nurse/admin | ✓ nurse/doctor | — | — |
| follow_ups | ✓ patient/doctor/nurse/admin | ✓ doctor/dentist/admin | ✓ doctor/dentist/admin | ✗ (trigger) |
| referrals | ✓ patient/doctor/admin | ✓ doctor/dentist/admin | ✓ doctor/dentist/admin | ✗ (trigger) |
| dispensing | ✓ patient/clinic_staff/admin | ✓ clinic_staff/admin | — | ✗ (trigger) |
| dental_records | ✓ patient/dentist/nurse | ✓ dentist (encounter-scoped) | ✓ dentist (draft only) | ✗ (trigger) |
| prescriptions | ✓ patient/doctor/nurse/admin | ✓ doctor/dentist/nurse | — | — |
| clinic_services | ✓ admin/clinic-member | — | — | — |
| queue_counters | ✓ all | ✓ clinical/admin | ✓ clinical/admin | — |
| medicines | ✓ all | ✓ clinic_staff/admin | ✓ clinic_staff/admin | ✓ admin only |
| prescription_items | ✓ patient/doctor/admin | — | — | — |

---

## D. Authentication & Authorization

### Auth Flow
1. User authenticates via Supabase Auth (email/password or SSO)
2. `getCurrentUser()` resolves: auth.uid → user_profile → roles → provider_profile (if clinical)
3. Navigation resolver filters NAVIGATION_REGISTRY by `AuthorizationContext`
4. Server actions enforce `requireAuth()` / `requireAnyRole()` at entry

### Role Hierarchy (Navigation Resolver)
- **super_admin:** Bypasses all role checks, sees everything
- **admin:** Admin-only items (users, clinics) — NO clinical PHI
- **doctor:** Clinical items (medical-records, vitals, fbs, prescriptions, etc.)
- **dentist:** Dental items (dental, referrals, clearances) — NOT medical-records
- **nurse:** Clinical items (vitals, fbs, queue, medical-records)
- **clinic_staff:** Operational items (queue, records, check-in)
- **student/faculty/non_teaching_staff:** Patient portal only

### Critical Rule: ADMIN ≠ CLINICAL
The navigation resolver explicitly separates admin pages from clinical pages. An admin user without a clinical role cannot access medical records, vitals, prescriptions, or dental records.

---

## E. Navigation & RBAC

### Navigation Registry (20 items)

| # | ID | Label | Roles | Priority |
|---|-----|-------|-------|----------|
| 1 | dashboard | Dashboard | all authenticated | 1 |
| 2 | queue | Queue | clinical + admin | 2 |
| 3 | records | Patient Records | clinical + admin | 3 |
| 4 | check-in | Patient Check-In | clinic_staff + admin | 4 |
| 5 | vitals | Vital Signs | nurse + doctor + admin | 10 |
| 6 | fbs | FBS | nurse + doctor + admin | 11 |
| 7 | medical-records | Medical Records | doctor + dentist + nurse + admin | 13 |
| 8 | prescriptions | Prescriptions | doctor + dentist + nurse + admin | 14 |
| 9 | dental | Dental | dentist + nurse + admin | 15 |
| 10 | medicines | Medicines | clinic_staff + admin | 16 |
| 11 | dispensing | Dispensing | clinic_staff + admin | 17 |
| 12 | clearances | Clearances | doctor + dentist + admin | 18 |
| 13 | referrals | Referrals | doctor + dentist + admin | 19 |
| 14 | follow-ups | Follow-Ups | doctor + dentist + nurse + admin | 20 |
| 15 | incidents | Incidents | clinical + admin | 21 |
| 16 | reports | Reports | admin + super_admin | 30 |
| 17 | notifications | Notifications | all authenticated | 40 |
| 18 | settings | Settings | admin + super_admin | 50 |
| 19 | admin-users | Users | admin + super_admin | 60 |
| 20 | admin-clinics | Clinics | admin + super_admin | 61 |

### AppHeader
- Sticky white header with role-filtered nav links
- Uses `NAVIGATION_REGISTRY` filtered by user roles
- Mobile hamburger menu

### AppSidebar
- White theme, collapsible sections
- Medical vs Admin separation
- Phosphor icons via `NavIcons.tsx` (client-only)

---

## F. Clinical Workflows

### F.1 Queue → Encounter → Clinical Records

```
Check-In (patient/register)
  → PatientSearch → select patient
  → Select clinic + service
  → addToQueue (atomic queue number via get_next_queue_number RPC)
  → queue_entries created (status: waiting)

Queue Management (queue)
  → Call Next → status: called
  → Start Service → creates encounter linked to queue_entry
                    → queue_entries.encounter_id set
                    → encounters.status: in_progress
  → In-Service → Vitals / FBS / Rx links with ?encounter={id}&patient={id}
  → Complete Service → queue_entries.status: completed
                       → encounters.status: completed
```

### F.2 Vital Signs Recording
```
Nurse/Doctor opens vitals page
  → PatientSearch selects patient
  → If from queue: ?encounter={id}&patient={id} pre-fills both
  → Form: BP, pulse, respiratory rate, temp, O2, height, weight
  → recordVitalSigns → vital_signs table (with encounter_id)
  → Audit log written
```

### F.3 FBS Recording
```
Nurse/Doctor opens FBS page
  → PatientSearch selects patient
  → If from queue: ?encounter={id}&patient={id} pre-fills both
  → Form: FBS value, fasting hours, notes
  → recordFBS → fbs_records table (with encounter_id)
  → Auto-classification: normal / pre_diabetic / diabetic
  → Audit log written
```

### F.4 Prescription Creation
```
Doctor/Dentist opens prescriptions page
  → PatientSearch selects patient
  → If from queue: ?encounter={id}&patient={id} pre-fills both
  → Form: medication, dosage, frequency, duration, quantity, refills, instructions
  → createPrescription → prescriptions table (with encounter_id)
  → Audit log written
```

### F.5 Dental Records
```
Dentist opens dental page
  → "New Dental Record" button
  → PatientSearch + encounter_id input
  → Form: chief complaint, oral examination, diagnosis, treatment plan, notes
  → createDentalRecord → dental_records table (linked to encounter)
  → Draft status → Edit → Finalize
  → RLS: only dentist assigned to encounter can create/edit
```

### F.6 Medical Records (Encounter-Embedded)
```
Doctor/Nurse opens medical-records
  → List of encounters with medical records
  → "New Encounter" → select patient → create encounter
  → View/Edit medical record linked to encounter
  → Finalize → status locked
```

---

## G. Patient Registration → Check-In → Queue

### Before (Isolated)
- Patient registration: standalone form, creates patient_profiles
- Queue add: separate page, raw patient_id text input
- No workflow connection

### After (Integrated)
- **Check-in page** (`/patient/register`): Multi-step workflow
  1. **Find Patient:** PatientSearch component with debounced search
  2. **Register (optional):** Inline registration if patient not found
  3. **Select Clinic & Service:** Dropdown with active clinics/services
  4. **Confirm:** addToQueue → queue number displayed

### Duplicate Prevention
- `checkInPatient` action checks for existing active queue entries today
- Returns error if patient already in queue (waiting/called/in_service)

---

## H. PatientSearch Component

### Location
`src/components/PatientSearch.tsx`

### Features
- Debounced search (250ms) via `searchPatients` server action
- Keyboard navigation (arrow keys + Enter)
- Dropdown with patient name, ID, sex, DOB, blood type
- Clear button to re-search
- Required field validation
- Accessible (ARIA roles, labels)

### Pages Updated (7 total)
| Page | Before | After |
|------|--------|-------|
| Queue | Raw text input | PatientSearch |
| Vitals | Raw text input | PatientSearch |
| FBS | Raw text input | PatientSearch |
| Prescriptions | Raw text input | PatientSearch |
| Clearances | Raw text input | PatientSearch |
| Referrals | Raw text input | PatientSearch |
| Follow-ups | Raw text input | PatientSearch |

---

## I. Encounter Context Connection

### Problem
Clinical pages (vitals, FBS, prescriptions) accepted raw patient IDs with no encounter linkage. Records were orphaned from the clinical encounter.

### Solution
- Queue page in-service row shows **Vitals / FBS / Rx** quick links
- Links pass `?encounter={id}&patient={id}` URL params
- Target pages read params via `useSearchParams()` and pre-fill form
- Server actions accept optional `encounter_id` parameter
- Prescriptions form shows "Linked to active encounter" indicator

### Data Flow
```
queue_entries.encounter_id
  → Queue page renders links with encounter param
  → Vitals/FBS/Prescriptions pages read URL params
  → Forms pre-fill patient_id and encounter_id
  → Server actions insert with encounter_id foreign key
```

---

## J. Security Fixes Applied

| Fix | Location | Description |
|-----|----------|-------------|
| Auth guard | `referrals/actions.ts` | `fetchClinics` now requires `requireAnyRole` (was unprotected) |
| Debug logging removed | `api/ai/carina/route.ts` | `console.error` removed from error handler |
| Debug logging removed | `dashboard/dashboard-content.tsx` | `console.error` removed from catch block |
| Medicine delete | `medicines/page.tsx` | Now uses server action with auth + audit (was direct client delete) |
| Notifications scoped | `notifications/actions.ts` | `fetchNotifications` filters by `user_id` (was fetching ALL) |
| Search debounce | `records/page.tsx` | 300ms debounce on search input |
| Admin role guard | `admin/users/page.tsx`, `admin/clinics/page.tsx` | Client-side redirect for non-admins |
| Nav RBAC | `AppHeader.tsx` | Nav links filtered by user roles via navigation registry |
| Setup redirect | `setup/page.tsx` | Redirects to login if superadmin already exists |
| Patient auth | `patient/page.tsx` | Auth check with redirect to `/auth/login` |

---

## K. Build & Compilation Status

| Check | Status |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Clean — zero errors |
| Next.js build (`npm run build`) | ✅ All 23 routes compiled |
| Console statements | ✅ None remaining in client code |
| Server actions auth | ✅ All use `requireAuth()` or `requireAnyRole()` |
| Audit logging | ✅ All write actions include `write_audit_log` RPC |

### Route Inventory (23 routes)

| Route | Type | Size |
|-------|------|------|
| `/` | Static | — |
| `/auth/login` | Static | — |
| `/auth/register` | Static | — |
| `/dashboard` | Dynamic | 8.97 kB |
| `/queue` | Dynamic | 3.71 kB |
| `/records` | Dynamic | 1.17 kB |
| `/patient` | Dynamic | 2.03 kB |
| `/patient/register` | Dynamic | 1.57 kB |
| `/vitals` | Dynamic | 3.31 kB |
| `/fbs` | Dynamic | 2.99 kB |
| `/medical-records` | Dynamic | 3.90 kB |
| `/prescriptions` | Dynamic | 3.17 kB |
| `/dental` | Dynamic | 1.02 kB |
| `/medicines` | Dynamic | 2.45 kB |
| `/dispensing` | Dynamic | 1.40 kB |
| `/clearances` | Dynamic | 3.06 kB |
| `/referrals` | Dynamic | 3.45 kB |
| `/follow-ups` | Dynamic | 3.23 kB |
| `/incidents` | Dynamic | 2.33 kB |
| `/reports` | Dynamic | 1.32 kB |
| `/notifications` | Dynamic | 1.32 kB |
| `/setup` | Dynamic | 1.50 kB |
| `/admin/users` | Dynamic | — |
| `/admin/clinics` | Dynamic | — |

---

## Summary

The UCIS application has been refactored from isolated CRUD modules into interconnected business workflows:

1. **Patient Check-In → Queue:** Multi-step workflow with patient search, optional registration, clinic/service selection, and atomic queue entry
2. **Queue → Encounter:** Automatic encounter creation when service starts; encounter completion on service completion
3. **Encounter → Clinical Records:** Vitals, FBS, prescriptions, and dental records linked to encounters via URL params
4. **Patient Search:** Reusable component replacing all 7 raw patient ID text inputs
5. **Dental Records:** Full CRUD with draft → finalize workflow, encounter-linked
6. **Dashboard:** Real workflow data from queue_entries (no placeholders)
7. **Security:** All pages auth-guarded, audit-logged, debug logging removed

All changes compile cleanly with zero TypeScript errors and successful Next.js build.
