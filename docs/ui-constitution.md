# UCIS UI Constitution

Authoritative UI/UX design constitution for the University Clinic Information System.

---

## 1. Governing Principle

UCIS is a healthcare system, not a generic admin dashboard.

The interface must reflect the difference between:
- Administrative information
- Operational clinic information
- Patient information
- Clinical information
- Confidential medical/dental information
- Pharmacy information
- Public information

> **UI visibility is not authorization.**

Sidebar, dashboard cards, buttons, routes, dialogs, and client-side permission checks are presentation mechanisms only. Actual authorization is enforced server-side.

---

## 2. Brand Identity

**System Name:** University Clinic Information System (UCIS)
**Short Form:** UCIS
**Clinic Identity:** Medical and Dental Clinic

Do not use: UCare AI, generic "Healthcare Dashboard", "Medical Admin", "Hospital Management System"

---

## 3. Design Philosophy

- **Academic Authority** — Appropriate for a State University/College
- **Clinical Precision** — Structured, readable, operationally efficient
- **Calm Reassurance** — Avoid visually stressful interfaces unless clinical urgency requires it
- **Digital Hygiene** — Clean spacing, restrained decoration, predictable interactions
- **Human-Centered Healthcare** — Design for real clinic workflows

---

## 4. Color System

### Design Tokens

```
--color-primary:           #1E40AF
--color-primary-hover:     #2563EB
--color-primary-active:    #1D4ED8
--color-primary-subtle:    #EFF6FF

--color-background:        #FFFFFF
--color-surface:           #F8FAFC
--color-surface-muted:     #F1F5F9

--color-border:            #E2E8F0
--color-border-strong:     #CBD5E1

--color-foreground:        #0F172A
--color-muted-foreground:  #64748B

--color-success:           #059669
--color-warning:           #D97706
--color-danger:            #DC2626
--color-info:              #2563EB
```

### University Blue

| Token | Value | Use |
|-------|-------|-----|
| Primary | `#1E40AF` | Brand, primary actions |
| Interactive | `#2563EB` | Links, secondary actions |
| Deep/Navy | `#0F172A`, `#1E293B` | Dark surfaces, sidebar |
| Subtle | `#EFF6FF`, `#DBEAFE` | Backgrounds, highlights |
| Neutral | `#FFFFFF`, `#F8FAFC`, `#E2E8F0`, `#334155` | General UI |

---

## 5. Clinical Semantic Colors

### Emergency
```
Foreground: #DC2626
Background: #FEF2F2
Border:     #FCA5A5
Meaning:    Immediate attention / emergency escalation
```

### Urgent
```
Foreground: #D97706
Background: #FFFBEB
Border:     #FCD34D
Meaning:    Requires priority attention
```

### Priority
```
Foreground: #CA8A04
Background: #FEFCE8
Border:     #FDE047
Meaning:    Moderate priority
```

### Routine
```
Foreground: #059669
Background: #ECFDF5
Border:     #6EE7B7
Meaning:    Normal / non-urgent
```

**Rule:** Never communicate clinical state using color alone. Use combinations of color, icon, text, shape, position, and accessible labels.

---

## 6. Typography

Hierarchy: Display > Page title > Section heading > Card heading > Body > Secondary text > Caption > Clinical metadata

Use `font-variant-numeric: tabular-nums` for:
- Queue numbers, vital signs, dosage, medicine quantities, stock quantities, timestamps, numerical statistics, measurement values

---

## 7. Spacing System

Prefer consistent spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

Clinical screens should have sufficient spacing to reduce data-entry errors.

---

## 8. Component Categories

```
components/
├── layout/
├── ui/
├── widgets/
├── charts/
├── forms/
├── clinical/
├── medical/
├── dental/
├── pharmacy/
├── queue/
├── documents/
├── dashboard/
└── carina/
```

---

## 9. UI Primitives

Maintain consistent primitives:
Button, IconButton, Card, Badge, StatusBadge, Alert, FormField, Input, Select, Combobox, DatePicker, TimePicker, Table, DataTable, Tabs, Dialog, Drawer, Sheet, Tooltip, Dropdown, CommandMenu, Breadcrumb, Pagination, EmptyState, LoadingState, ErrorState, Skeleton, Toast, ConfirmationDialog

---

## 10. Healthcare-Specific Components

PatientHeader, PatientIdentityCard, PatientRiskBanner, AllergyAlert, VitalSignsCard, TriagePriorityBadge, QueueTicket, QueueStatus, EncounterTimeline, ClinicalNote, PrescriptionCard, MedicineStockBadge, FollowUpCard, ReferralCard, ClearanceStatus, MedicalCertificate, DentalClearance, Odontogram, ToothSurface, ClinicalHistoryTimeline, FBSHistory, ProviderAssignmentBadge, BreakGlassDialog, ClinicalRecordLockIndicator

---

## 11. Operational States

Consistent semantic status badges:
Available, On Duty, In Consultation, Waiting, Triaged, Called, In Progress, Completed, Cancelled, Referred, Follow-up Required, Unavailable, On Leave, Training, Off-Campus

---

## 12. Responsive Breakpoints

| Breakpoint | Target | Requirements |
|-----------|--------|--------------|
| 320-414px | Mobile | Single-column, thumb-friendly, sticky primary action, no overflow, simplified nav |
| 768-1024px | Tablet | Two-column where appropriate, touch optimized, landscape-friendly |
| 1024px+ | Desktop | Multi-column clinical layouts, persistent nav, patient timeline, data tables |
| Large displays | Kiosk | Queue/kiosk mode only |

Minimum touch target: 48x48px for primary interactive controls.

---

## 13. Accessibility

Target: **WCAG 2.1 AA minimum**

Requirements:
- Semantic HTML
- Keyboard navigation
- Visible focus states (`focus-visible:ring-2`)
- Screen-reader labels
- Accessible forms
- Error announcements
- Sufficient contrast
- No color-only meaning
- Reduced-motion support
- Logical tab order
- Accessible dialogs and tables

---

## 14. Forms

- Group related fields
- Use clear labels
- Show units
- Validate immediately where useful
- Preserve user input on recoverable errors
- Use progressive disclosure
- Distinguish required and optional fields
- Never silently discard entered clinical data

---

## 15. Dialogs

Use only when necessary. Dangerous actions require confirmation:
- Delete, Dispense, Finalize, Amend, Approve, Reject, Break-glass access

Confirmation dialogs must explain:
- What will happen
- Why it matters
- What cannot be undone
- What authorization is being used

---

## 16. Loading/Empty/Error States

Every data-driven screen must have:
- **Loading:** Prefer Skeleton over "Loading..."
- **Empty:** Meaningful message with CTA where appropriate
- **Error:** Explain what happened, avoid technical details, preserve input, provide recovery
- **Success:** Clear feedback for successful operations

---

## 17. Role-Aware Dashboards

### Student/Faculty/Non-Teaching Staff
Queue status, own clinic visits, follow-ups, clearance status, prescriptions, documents, FBS history, notifications, Carina

### Clinic Staff
Today's queue, walk-ins, patient registration, queue operations, documents, clinic statistics, authorized admin workflows. No automatic full clinical PHI.

### Nurse
Triage queue, assigned/care-team patients, vital signs, follow-up, nurse-relevant clinical info, queue status, Carina. Must follow care-team and encounter authorization.

### Doctor
Assigned clinical queue, patient encounters, medical history, vitals, medical notes, prescriptions, referrals, follow-ups, clearances within authorization, Carina. Must not expose dental records.

### Dentist
Dental queue, dental encounters, dental history, odontogram, dental procedures, dental clearance, referrals, follow-up, Carina. Must not expose medical records.

### Admin
Operational administration, user management, configuration, reports, audit/operations, system statistics. **ADMIN does not automatically receive clinical PHI.**

### Super Admin
System administration, configuration, security, organization management, system health, audit. **SUPER_ADMIN does not automatically receive clinical PHI.**

---

## 18. Multi-Role Users

Combine authorized capabilities without expanding clinical scope.

Correct: Administrative capabilities + Doctor clinical capabilities within provider assignment/encounter scope

Incorrect: ADMIN + DOCTOR = all medical records

---

## 19. Sidebar

Must be generated from the centralized authorization model. Sidebar visibility is not authorization.

Recommended groups:
Overview, Clinic Operations, Patients, Queue, Medical, Dental, Pharmacy, Documents, Reports, Administration, Security, Carina

---

## 20. Carina AI Assistant

### Visual Identity
- Use existing `/public/carina.png`
- Feel: approachable, intelligent, professional, calm, healthcare-oriented, trustworthy
- Avoid: cartoonish behavior, excessive animations, childish styling, flashing UI

### Components
CarinaButton, CarinaPanel, CarinaHeader, CarinaMessage, CarinaPrompt, CarinaToolResult, CarinaLoading, CarinaError, CarinaSourceIndicator

### Role-Awareness
- Guest: Public information only
- Authenticated: role + permissions + scope
- Carina does not determine authorization; the server does

### Guest Mode
Allowed: Clinic hours, location, services, general procedures, contact info
Forbidden: Patient records, medical records, dental records, FBS, prescriptions, clearances, queue patient info, private dashboards, documents, reports

### Clinical Safety
Carina must never independently: diagnose, prescribe, change medication, approve clearance, finalize/amend/delete clinical records, alter patient identity/permissions/RLS, execute arbitrary SQL

Clinical AI output is assistance/draft content. Human provider review is mandatory.

---

## 21. Privacy-First UI

- Never show unnecessary PHI
- Never show full medical history when only one item is needed
- Never show confidential info in notifications
- Never show patient names on public queue boards
- Never put diagnosis in URLs
- Never show sensitive info in browser titles or console logs

---

## 22. Queue/Public Display

Public queue must NEVER display: patient name, diagnosis, symptoms, medical condition, clinical notes, patient ID, sensitive personal information. Only minimum queue information.

Kiosk mode: Large typography, high contrast, hide navigation, avoid PHI, readable from several meters.

---

## 23. Clinical Record UX

- Rapid review
- Longitudinal history
- Structured documentation
- Safe editing
- Clear record state (Draft, In Review, Finalized, Amended)

Finalized records must appear read-only. Use View/Amend/View Amendment History instead of Edit.

---

## 24. Medical Record Structure

```
Patient Header
    ↓
Alerts / Important Information
    ↓
Current Encounter
    ↓
Vitals
    ↓
History
    ↓
Clinical Notes
    ↓
Assessment / Plan
    ↓
Prescription
    ↓
Referral / Follow-up
    ↓
Documents
```

---

## 25. Vital Signs / Triage UI

- Large touch-friendly inputs
- Numeric keyboards where appropriate
- Units displayed beside values
- Tabular numerals
- Validation feedback
- Obvious abnormal/critical indicators
- Minimal unnecessary decoration

---

## 26. Pharmacy UI

Prioritize: medicine identification, batch, expiry, available quantity, dispensing quantity, transaction status, stock warnings

---

## 27. Clearance UX

Status: Pending, For Review, Approved, Rejected, Expired

Explicit metadata: Issued, Issued By, Valid Until, Verification Status

---

## 28. Dental Odontogram

Support: adult/pediatric dentition, FDI numbering, tooth surfaces, procedures, historical conditions, restoration states, missing/extracted teeth

Semantic states: Sound, Caries, Restoration, Missing, Extracted, Crown, Sealant, Other configured condition

---

## 29. Break-Glass UI

Not an ordinary button. Use distinct visual treatment:
- Emergency / Restricted Access
- Require explicit confirmation, reason/justification, appropriate authorization, audit trail

---

## 30. Audit-Aware UI

Sensitive actions should communicate they are controlled:
- "This action will be recorded in the audit log."
- For: break-glass, amendments, exports, privileged operations

---

## 31. Animation

Use subtle animation only when it improves understanding:
- Drawer/dialog transitions
- Loading indicators
- Navigation transitions
- Queue state changes

Avoid: excessive bouncing, flashing, unnecessary motion, animated clinical alerts

Respect `prefers-reduced-motion`

---

## 32. Server/Client UI Boundary

Follow existing Next.js architecture. Prefer server-side rendering/data access where appropriate. Use client components only when interactivity requires them.

Never move authorization to the client merely because a component is interactive.

---

## 33. UI Authorization

Every UI action must correspond to a real authorization requirement with: permission + role + scope

Use Hidden when user has no reason to see the action. Use Disabled when relevant but temporarily unavailable.

> Hidden/disabled controls are UX behavior, not security.

---

## 34. Design Token Rule

Do not use arbitrary visual values repeatedly. Use: Design Token → Component → Page

---

## 35. Component Reuse Rule

Before creating a new component, inspect existing components. Prefer existing component + variant over new component unless semantic behavior is genuinely different.

---

## 36. Dashboard Widget Rule

Each widget must have: Purpose, Data source, Authorization, Loading state, Empty state, Error state, Responsive behavior

---

## 37. Security UX Rule

Never expose security-sensitive information through UI errors. Never show "RLS policy denied SELECT". Instead show "You do not have permission to view this information."

---

## 38. Clinical UX Rule

The UI must never make the AI, system, or interface appear to be the clinical decision-maker.

Correct: "Carina suggestion" / "Potential follow-up reminder"
Incorrect: "Carina diagnosis" / "Patient requires treatment X" (unless explicitly entered/approved by authorized clinician)

---

## 39. Never Do These

- Introduce a second design system unnecessarily
- Copy entire Cleopatra architecture
- Replace Next.js with Vite
- Introduce Handlebars
- Bypass existing components
- Create random colors
- Hard-code role checks throughout components
- Trust client-side permissions
- Expose PHI in public interfaces
- Expose clinical information to ADMIN merely because of the role
- Expose medical records to dentists
- Expose dental records to doctors
- Expose unrelated clinical records to nurses
- Create fake data/buttons/statistics
- Generate replacement Carina imagery
- Expose API keys
- Put Supabase service-role credentials in client code

---

## 40. Final Acceptance Rule

A UI feature is complete only when ALL are satisfied:

```
VISUAL DESIGN
    +
RESPONSIVENESS
    +
ACCESSIBILITY
    +
HEALTHCARE UX
    +
PRIVACY
    +
RBAC
    +
PERMISSIONS
    +
SERVER AUTHORIZATION
    +
FUNCTIONAL WIRING
    +
ERROR/LOADING/EMPTY STATES
    +
TESTING
```

---

## 41. Final Principles

> The UI represents authorization; it does not create authorization.

> The dashboard represents the user's responsibilities; it does not define the user's privileges.

> The sidebar represents available workflows; it does not secure them.

> Carina assists the user; it does not determine what the user is allowed to access.

> Clinical data must always follow the UCIS authorization and privacy model.

> Design consistency must never override clinical safety or security.
