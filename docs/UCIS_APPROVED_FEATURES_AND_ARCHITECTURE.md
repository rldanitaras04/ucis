# UNIVERSITY CLINIC INFORMATION SYSTEM (UCIS)
## Approved Features & Target Architecture Baseline

**Document Type:** Product, Functional, Technical, and Security Architecture Specification  
**System:** University Clinic Information System (UCIS)  
**Scope:** University Medical Clinic + Dental Clinic  
**Initial Deployment:** Single campus/clinic, multi-campus ready  
**Technology Baseline:** Next.js + TypeScript + Supabase PostgreSQL + Supabase Auth + Supabase Storage + Vercel + GitHub  
**Architecture Principle:** Database-enforced security with defense in depth  
**Status:** APPROVED TARGET ARCHITECTURE / PRE-PRODUCTION BASELINE  
**Important:** This document defines the approved target architecture and features. It does **not** by itself authorize production migration SQL. Production migration requires the independent security gate, executable tests, and explicit human approval.

---

# 1. EXECUTIVE SUMMARY

The University Clinic Information System (UCIS) is a mobile-first, secure, extensible information system for the university medical and dental clinic.

The system is designed around:

- longitudinal electronic medical records (EMR);
- dental records and odontogram history;
- walk-in registration and queue management;
- nurse/staff triage and vital signs;
- physician and dentist consultation;
- prescriptions and pharmacy dispensing;
- medical and dental clearances;
- certificates and controlled documents;
- FBS logging and patient-visible history;
- referrals and follow-up;
- injury/incident documentation;
- clinic inventory;
- dashboards and operational reporting;
- auditability and privacy controls;
- QR verification of official certificates/clearances;
- controlled notifications;
- advisory AI capabilities;
- PWA/mobile-first operation;
- future multi-campus expansion.

The database is the authoritative security boundary. The application layer must be treated as untrusted and must never be relied upon as the sole enforcement mechanism for access to protected information.

---

# 2. APPROVED FUNCTIONAL SCOPE

## 2.1 Patient Types

The system supports:

1. Students
2. Faculty
3. Non-teaching staff
4. Other authorized university personnel
5. Walk-in/non-university patients when permitted by clinic policy

University identity information is represented through internal UCIS profiles while external university identifiers remain external identifiers.

Internal UUIDs are used as primary keys.

---

# 3. USER ROLES

The approved baseline contains nine principal roles:

| Role | Primary Responsibility |
|---|---|
| SUPER_ADMIN | System administration and configuration |
| ADMIN | Administrative/operational management |
| DOCTOR | Medical clinical care |
| DENTIST | Dental clinical care |
| NURSE | Nursing/triage/care-team clinical activities |
| CLINIC_STAFF | Registration, queue, operational support |
| STUDENT | Self-service access to permitted records |
| FACULTY | Self-service access to permitted records |
| NON_TEACHING_STAFF | Self-service access to permitted records |

## 3.1 Critical Role Rule

**ADMIN ≠ CLINICAL**

Neither ADMIN nor SUPER_ADMIN automatically receives clinical PHI access.

If an administrative user also serves as a physician, dentist, or nurse, clinical access must come through the independently assigned clinical role, clinical permissions, provider profile, active provider assignment, and encounter scope.

Administrative campus/clinic scope must never substitute for clinical provider assignment.

---

# 4. AUTHORIZATION MODEL

The target authorization model is:

**permission + scope + role specialization**

Roles identify capabilities.

Permissions identify actions.

Scope identifies the organizational or clinical boundary.

Provider specialization identifies medical versus dental authority.

For clinical PHI, authorization follows:

```text
auth.uid
  → active user_profile
  → active provider_profile
  → provider_type
  → required permission
  → active provider_assignment
  → clinic
  → clinic_service
  → effective dates
  → encounter
  → target clinical record
```

For provider access to a clinical record, the encounter must be assigned to the provider unless an explicitly defined care-team rule applies.

---

# 5. CORE SYSTEM WORKFLOW

The standard clinic workflow is:

```text
Identity Verification
        ↓
Patient Registration / Retrieval
        ↓
Walk-in Check-in
        ↓
Queue Assignment
        ↓
Nurse / Staff Triage
        ↓
Vital Signs
        ↓
Provider Assignment
        ↓
Medical or Dental Consultation
        ↓
Treatment / Prescription / Referral / Clearance
        ↓
Pharmacy Dispensing (if applicable)
        ↓
Follow-up / Instructions
        ↓
Document Generation
        ↓
Encounter Completion
        ↓
Audit / Reporting
```

No online appointment booking is required in the initial version.

---

# 6. MEDICAL CLINIC FEATURES

## 6.1 Consultation

The medical module supports:

- chief complaint;
- history;
- assessment;
- clinical notes;
- treatment;
- instructions;
- follow-up;
- referrals;
- prescription;
- medical certificates;
- medical clearances;
- encounter status.

Clinical records are longitudinal and linked to the patient's encounter history.

## 6.2 First Aid

Support for:

- minor injuries;
- basic first aid;
- treatment notes;
- supplies used;
- disposition;
- follow-up instructions.

## 6.3 Emergency Documentation

Emergency encounters support:

- emergency classification;
- immediate interventions;
- provider notes;
- disposition;
- referral;
- incident linkage;
- follow-up.

The system documents care; it does not autonomously determine emergency treatment.

---

# 7. VITAL SIGNS AND TRIAGE

Nurse/authorized staff can record:

- blood pressure;
- pulse rate;
- respiratory rate;
- temperature;
- oxygen saturation;
- height;
- weight;
- BMI-derived value;
- other configurable measurements.

Vital signs are timestamped and associated with an encounter.

Historical trends can be displayed to authorized users.

---

# 8. FBS MODULE

A dedicated FBS module is included.

Features:

- FBS result recording;
- date/time;
- encounter linkage;
- historical results;
- patient-visible history subject to authorization;
- trend visualization;
- informational flags.

The FBS module must **not** autonomously diagnose disease.

Any AI-generated interpretation is informational/draft content and requires appropriate clinical review.

---

# 9. DENTAL CLINIC

The dental module supports:

- dental consultation;
- oral assessment;
- dental history;
- cleaning;
- extraction;
- filling/restoration;
- referral;
- dental clearance;
- treatment notes;
- follow-up;
- odontogram.

## 9.1 Odontogram

The odontogram uses an append-oriented/history-preserving model.

Previous dental states must not be silently overwritten.

Corrections are represented through controlled amendment/history mechanisms.

---

# 10. MEDICAL AND DENTAL CLEARANCES

Supported clearance types include:

- Medical Clearance
- PE Clearance
- Internship/OJT Clearance
- Athletics Clearance
- Employment Clearance
- Dental Clearance

Clearance issuance must be based on an authorized provider decision.

The system may assist with documentation, but AI cannot independently approve or deny a clearance.

---

# 11. PRESCRIPTION AND PHARMACY

## 11.1 Prescription

Prescriptions include:

- medication;
- dosage;
- frequency;
- route;
- duration;
- quantity;
- instructions;
- prescribing provider;
- encounter linkage;
- status.

## 11.2 Medicine Master

Medicine records support:

- generic name;
- brand name where applicable;
- dosage form;
- strength;
- unit;
- active/inactive status;
- reorder threshold.

## 11.3 Batch Management

Each medicine may have multiple batches containing:

- batch number;
- expiration date;
- quantity;
- acquisition/source information;
- status.

## 11.4 Inventory

Inventory supports:

- stock-in;
- stock-out;
- adjustments;
- transfers if later required;
- dispensing;
- batch-level tracking;
- expiration alerts;
- reorder alerts;
- inventory reports.

## 11.5 Transactional Dispensing

Dispensing must be atomic:

```text
BEGIN
  lock eligible inventory/batch rows
  verify prescription
  verify batch availability
  verify expiration
  verify quantity
  deduct stock
  record dispensing
COMMIT
```

The design must prevent negative stock and ensure that concurrent attempts to dispense the final available unit cannot both succeed.

---

# 12. QUEUE MANAGEMENT

The system is walk-in based.

Queue features:

- patient check-in;
- service selection;
- queue number;
- priority classification when authorized;
- queue status;
- provider assignment;
- waiting/serving/completed/cancelled states;
- queue display;
- daily queue statistics.

## 12.1 Queue Number Generation

Queue numbers must never use:

```text
MAX(queue_number) + 1
```

The target architecture uses a `queue_counters` mechanism with atomic upsert/locking semantics and uniqueness for the logical queue scope.

Required uniqueness concept:

```text
(clinic_id, service_id, queue_date, queue_number)
```

---

# 13. ENCOUNTER MODEL

The encounter is the central clinical event.

It connects:

- patient;
- clinic;
- service;
- provider;
- queue entry;
- medical or dental context;
- clinical records;
- prescriptions;
- referrals;
- clearances;
- documents;
- follow-up.

Cross-table invariants must ensure that patient, clinic, service, provider, queue, and clinical record relationships remain consistent.

---

# 14. PATIENT RECORDS

Each patient has a longitudinal record.

Supported information includes:

- identity;
- demographic profile;
- university affiliation;
- contact information;
- patient type;
- medical encounters;
- dental encounters;
- vital signs;
- FBS history;
- prescriptions;
- dispensing history where permitted;
- clearances;
- certificates;
- referrals;
- incidents;
- follow-ups.

A patient's internal UUID alone never grants access.

Patient self-access must resolve:

```text
auth.uid()
 → user_profiles
 → patient_profiles
```

and then apply the specific record authorization rules.

---

# 15. DOCUMENT MANAGEMENT

Supported documents include:

- medical certificate;
- medical clearance;
- dental clearance;
- prescription;
- referral;
- consultation record;
- dental record;
- incident record;
- health certificate;
- statistical reports;
- monthly reports;
- annual reports.

Documents should have:

- document type;
- control number where applicable;
- issuing clinic;
- issuing provider;
- patient/encounter linkage;
- issue date;
- status;
- verification information where applicable.

---

# 16. QR DOCUMENT VERIFICATION

QR verification applies to official certificates and clearances where required.

The public verification mechanism must:

- expose no direct anonymous table SELECT;
- use a narrow verification RPC;
- validate the verification token;
- return only minimal authenticity metadata;
- expose no patient name;
- expose no patient ID;
- expose no diagnosis;
- expose no clinical notes;
- expose no clinical payload.

Verification tokens must be cryptographically strong, non-sequential, revocable, and protected against enumeration through application/edge rate limiting.

---

# 17. REFERRALS

Referral records support:

- referral reason;
- destination;
- urgency;
- provider;
- encounter;
- instructions;
- status;
- follow-up.

Referral status transitions must be controlled.

---

# 18. FOLLOW-UP

Follow-up management supports:

- recommended date;
- reason;
- provider;
- encounter;
- status;
- notes;
- reminder status.

Notifications may be used for follow-up reminders.

No appointment-booking system is required.

---

# 19. INJURY / INCIDENT MODULE

Incident records support:

- incident date/time;
- location;
- circumstances;
- injury information;
- immediate response;
- treatment;
- referral;
- involved encounter;
- follow-up;
- responsible recorder.

---

# 20. NOTIFICATIONS

Supported notification channels:

- in-app;
- email.

SMS is optional/future.

Notifications include:

- follow-up reminders;
- clinic announcements;
- emergency announcements;
- operational notices.

Notifications must avoid unnecessary PHI.

No appointment reminder subsystem is required in the initial release.

---

# 21. DASHBOARDS

## 21.1 Role-Specific Dashboards

### SUPER_ADMIN / ADMIN
- patient/visit statistics;
- clinic utilization;
- queue performance;
- pharmacy/inventory status;
- reports;
- system activity;
- user/role management;
- audit activity subject to authorization.

### DOCTOR
- today's queue;
- assigned encounters;
- patient history;
- pending consultations;
- follow-ups;
- prescriptions;
- medical clearances.

### DENTIST
- dental queue;
- assigned dental encounters;
- dental history;
- odontograms;
- dental procedures;
- dental clearances.

### NURSE
- queue;
- triage;
- assigned/care-team encounters;
- vital signs;
- follow-up tasks.

### CLINIC_STAFF
- registration;
- queue;
- patient verification;
- operational documents;
- non-clinical workflows.

### STUDENT/FACULTY/NON_TEACHING_STAFF
- own permitted records;
- certificates/clearances;
- FBS history where applicable;
- follow-up information;
- notifications.

---

# 22. REPORTING

Reporting periods:

- daily;
- weekly;
- monthly;
- semester;
- academic year;
- custom date range.

Exports:

- Excel;
- PDF;
- CSV.

Reports may support:

- administration;
- clinic management;
- student affairs;
- HR;
- accreditation;
- internal audit;
- institutional planning;
- CHED/DOH-related reporting where applicable.

The system must not claim automatic regulatory compliance merely because a report exists. Actual regulatory requirements must be separately validated.

Report access and exports must be authorized and auditable.

---

# 23. AUDIT LOGGING

Audit logs are append-only.

Application roles cannot ordinarily:

- UPDATE audit logs;
- DELETE audit logs;
- TRUNCATE audit logs.

Audit information should minimize PHI and capture, as appropriate:

- actor;
- action;
- object type;
- object ID;
- timestamp;
- outcome;
- request/correlation ID;
- changed-field metadata.

PostgreSQL triggers do not inherently audit SELECT operations. Sensitive read auditing therefore requires controlled data-access functions and/or application instrumentation for designated PHI access.

---

# 24. CLINICAL RECORD IMMUTABILITY

Finalized medical and dental records must be immutable.

The preferred enforcement model is blanket denial:

```text
IF OLD.status = FINALIZED
THEN
    reject ordinary UPDATE
```

This protects existing and future fields without relying on a list of individually protected columns.

Corrections use amendment records.

An amendment should capture:

- original record reference;
- requested correction;
- corrected information;
- reason;
- actor;
- timestamp;
- authorization;
- approval;
- audit trail.

Finalized records must never silently revert to draft.

---

# 25. STATUS TRANSITIONS

Every workflow with a status field has an explicit transition graph.

Examples:

```text
DRAFT → FINALIZED
FINALIZED → AMENDED
PENDING → DISPENSED
PENDING → CANCELLED
ACTIVE → COMPLETED
ACTIVE → CANCELLED
```

Invalid transitions must fail.

Status transitions must be enforced at the database/RPC layer rather than only in UI code.

---

# 26. DELETION POLICY

Clinical records are not ordinarily physically deleted.

Lifecycle states include concepts such as:

- active;
- finalized;
- amended;
- archived;
- cancelled;
- revoked;
- inactive.

Application roles should not receive unrestricted DELETE access to clinical data.

Exceptional purge, if ever required, must be separately authorized, controlled, and audited.

Audit logs are append-only.

---

# 27. BREAK-GLASS ACCESS

If emergency access is implemented, it must require:

- actor;
- reason;
- target patient/record;
- start time;
- expiration time;
- authorization/approval policy;
- elevated audit logging;
- automatic expiration.

Break-glass access must never become permanent clinical scope.

---

# 28. SECURITY DEFINER FUNCTIONS

Every SECURITY DEFINER function must have a documented:

1. exact signature;
2. owner;
3. fixed `search_path`;
4. caller class;
5. EXECUTE privileges;
6. authorization predicates;
7. parameter validation;
8. RLS interaction;
9. RLS-bypass rationale;
10. data-access scope;
11. abuse/DoS considerations;
12. negative security tests.

Privileged functions must not be executable by PUBLIC unless explicitly designed as a narrow public verification function.

---

# 29. IMPORTANT AUTHORIZATION FUNCTIONS

The target architecture includes controlled functions for operations such as:

- provider authorization;
- patient authorization;
- role validation;
- queue number generation;
- pharmacy dispensing;
- medical record amendment;
- dental record amendment;
- consent recording;
- consent withdrawal;
- public document verification;
- document control number generation;
- audit writing;
- reporting/export authorization.

Each function must have an explicit caller and authorization boundary.

---

# 30. CONSENT

Patient consent operations are controlled.

Consent records should contain:

- patient;
- consent type;
- consent status;
- effective timestamp;
- withdrawal timestamp where applicable;
- actor/source;
- audit information.

Creation and withdrawal should use controlled operations with server-controlled timestamps.

---

# 31. STORAGE

Clinical documents are stored in private storage.

Rules:

- no public bucket for PHI;
- access requires authorization;
- short-lived signed URLs;
- record-level authorization before download;
- storage object ownership/linkage must be controlled;
- storage policies must not rely only on frontend checks.

---

# 32. REALTIME

Realtime is restricted for sensitive data.

Sensitive tables should not use unrestricted realtime subscriptions.

Permitted realtime functionality should be limited to narrowly scoped operational events such as:

- queue changes;
- service status;
- non-PHI operational updates.

Where realtime authorization cannot be proven equivalent to RLS, use narrowly scoped channels or server-mediated events.

---

# 33. AI CAPABILITIES

AI is advisory only.

Approved AI capabilities include:

- patient history summarization;
- encounter history summarization;
- documentation assistance;
- trend analysis;
- informational red-flag detection;
- follow-up support;
- population-level health analytics;
- disease surveillance support;
- natural-language dashboard queries;
- administrative/operational insights.

## 33.1 AI Prohibitions

AI must never independently:

- diagnose;
- prescribe;
- approve medication;
- issue medical clearance;
- issue dental clearance;
- finalize a clinical record;
- bypass RLS;
- execute arbitrary SQL;
- use the Supabase service-role key from client code.

AI input must be authorization-filtered and data-minimized.

AI output remains draft content until reviewed and approved by an authorized provider.

AI interactions must be auditable.

---

# 34. DATA PRIVACY AND SECURITY

The architecture follows privacy-by-design principles appropriate to a university health information system and applicable Philippine privacy requirements.

Core controls:

- RBAC;
- permission-based authorization;
- scope enforcement;
- RLS;
- least privilege;
- database-enforced constraints;
- audit trails;
- private storage;
- controlled exports;
- session controls;
- login history;
- consent;
- secure document verification;
- data minimization;
- secure backups;
- separation of environments.

The architecture does not claim legal/regulatory compliance automatically. Compliance must be validated against the institution's actual policies and applicable laws/regulations.

---

# 35. DATABASE ARCHITECTURE

The target design contains approximately 49 tables organized into domains.

## Organizational
- universities
- campuses
- clinics
- clinic_services

## Identity / Access
- user_profiles
- roles
- permissions
- user_roles
- role_permissions

## Providers
- provider_profiles
- provider_assignments

## Patients
- patient_profiles
- patient-related identity/consent structures

## Encounters / Queue
- encounters
- queue_entries
- queue_counters

## Medical
- medical_records
- vital_signs
- fbs_records
- prescriptions
- clinical_referrals
- follow_ups
- incidents
- medical_record_amendments

## Dental
- dental_records
- dental_record_amendments
- odontogram/history structures

## Pharmacy
- medicines
- medicine_batches
- inventory movements
- dispensing structures

## Documents
- documents
- certificates
- clearances
- verification structures

## Audit / System
- audit_logs
- login_history
- export_audit
- notifications
- consent structures
- break-glass structures
- AI interaction records
- supporting configuration/reference tables

Exact final table names and columns must be frozen in the database architecture artifact before SQL generation.

---

# 36. IDENTITY ARCHITECTURE

Supabase Auth is responsible for authentication.

UCIS maintains application-level profiles.

Internal identifiers:

```text
UUID
```

University identifiers such as:

```text
student number
employee number
faculty identifier
```

remain external identifiers.

A patient profile may be linked to a user profile, but the relationship must enforce the intended one-to-zero-or-one rule.

`patient_profiles.user_profile_id` must therefore be UNIQUE when populated.

---

# 37. ORGANIZATIONAL HIERARCHY

The logical hierarchy is:

```text
University
   ↓
Campus
   ↓
Clinic
   ↓
Clinic Service
   ↓
Provider Assignment
   ↓
Encounter
   ↓
Clinical Record
```

Clinical authorization must follow this chain.

Administrative campus/clinic scope is not equivalent to clinical scope.

---

# 38. PROVIDER ASSIGNMENT RULES

Provider assignments must include an explicit service.

`service_id` must not use:

```text
NULL = all services
```

Every assignment explicitly identifies the authorized clinic/service relationship.

Assignments must have:

- provider;
- clinic;
- service;
- effective start;
- effective end where applicable;
- active status.

Provider type must match the service/clinical domain.

---

# 39. MEDICAL/DENTAL SEPARATION

Database policies explicitly enforce:

```text
DOCTOR → medical clinical records
DENTIST → dental clinical records
```

A doctor cannot obtain dental PHI merely because the user has administrative privileges.

A dentist cannot obtain medical PHI merely because the user has administrative privileges.

Cross-specialty SELECT access must be explicitly denied.

---

# 40. NURSE SCOPE

Nurses do not receive unrestricted clinic-wide clinical-record access.

The target model is encounter/care-team scoped access.

The nurse may access information necessary for:

- triage;
- vital signs;
- assigned care;
- assigned encounters;
- follow-up tasks.

The exact care-team implementation must be explicitly represented in the database authorization model.

---

# 41. CLINIC STAFF SCOPE

Clinic staff can perform operational tasks such as:

- patient registration;
- identity verification;
- queue management;
- check-in;
- document workflow support;
- non-clinical administrative functions.

Clinic staff must not receive unrestricted access to clinical notes or sensitive clinical information merely because they operate the clinic.

---

# 42. PATIENT SELF-SERVICE

Patients can access their own permitted information.

Examples:

- own profile;
- own visit history;
- own FBS history where applicable;
- own documents;
- own clearances;
- own follow-up information;
- own notifications.

A UUID or guessed identifier must not be sufficient for access.

---

# 43. RLS ARCHITECTURE

RLS is enabled for protected tables.

The complete target matrix is:

```text
49 tables × 9 roles × 4 actions
```

Actions:

- SELECT
- INSERT
- UPDATE
- DELETE

Each matrix entry must specify:

- ALLOW;
- DENY;
- CONTROLLED RPC;

plus scope.

The matrix must distinguish:

- administrative scope;
- clinical scope;
- patient self-scope;
- provider assignment scope;
- care-team scope;
- public verification scope.

---

# 44. FAIL-CLOSED SECURITY

The system follows fail-closed rules.

Examples:

- NULL `auth.uid()` → DENY;
- missing user profile → DENY;
- inactive user → DENY;
- inactive provider → DENY;
- expired provider assignment → DENY;
- mismatched provider type → DENY;
- mismatched clinic → DENY;
- mismatched service → DENY;
- unassigned encounter → DENY;
- unauthorized patient → DENY.

---

# 45. AUDITABLE REPORTING AND EXPORT

Every sensitive report/export operation must be:

- authorized;
- scoped;
- logged;
- attributable to a user;
- associated with a timestamp;
- associated with the requested report/data scope.

Exports must not silently bypass RLS.

---

# 46. PWA / MOBILE-FIRST ARCHITECTURE

The application is mobile-first and responsive.

Target characteristics:

- installable PWA;
- responsive UI;
- touch-friendly controls;
- queue-focused operational screens;
- fast patient lookup;
- optimized provider workflow;
- accessible forms;
- secure session handling.

Sensitive clinical data should not be indiscriminately cached offline.

The service worker should primarily cache the application shell and explicitly approved non-sensitive assets.

---

# 47. TECHNOLOGY STACK

## Frontend
- Next.js
- TypeScript
- App Router
- responsive/mobile-first UI
- PWA

## Backend
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- controlled PostgreSQL functions/RPC

## Deployment
- Vercel

## Source Control
- GitHub

## Development
- local development;
- development Supabase project;
- staging Supabase project;
- production Supabase project.

No production secrets belong in GitHub.

The Supabase service-role key must never be exposed to browser/client code.

---

# 48. ENVIRONMENT STRATEGY

Separate environments:

```text
Development
     ↓
Staging
     ↓
Production
```

Each environment should have its own:

- Supabase project;
- environment variables;
- storage;
- database;
- deployment configuration.

Production deployment requires successful automated checks.

---

# 49. MIGRATION STRATEGY

The final migration must be dependency ordered.

Recommended high-level sequence:

1. Extensions/schemas
2. University/campus structures
3. Auth-linked profiles
4. Roles/permissions
5. User-role assignments
6. Clinics/services
7. Provider profiles
8. Provider assignments
9. Patient profiles and identity constraints
10. Encounters
11. Queue counters and queue entries
12. Medical tables
13. Dental tables
14. FBS
15. Prescriptions
16. Pharmacy/inventory
17. Documents/clearances
18. Audit/login/export/break-glass
19. Storage metadata
20. Authorization functions
21. SECURITY DEFINER functions
22. Constraints/triggers/status transitions
23. RLS enablement
24. Explicit RLS policies
25. Realtime authorization
26. Seed/reference data
27. Deterministic security fixtures
28. Security tests
29. Reporting/verification functions
30. Final security gate

Circular dependencies such as queue/encounter relationships must be resolved through phased creation/deferred constraints rather than unsafe shortcuts.

---

# 50. TESTING REQUIREMENTS

Security testing must include deterministic personas.

Minimum personas:

- ADMIN
- SUPER_ADMIN
- DOCTOR
- DENTIST
- NURSE
- CLINIC_STAFF
- STUDENT
- FACULTY
- NON_TEACHING_STAFF
- ADMIN + DOCTOR
- ADMIN + DENTIST
- ADMIN + NURSE
- SUPER_ADMIN + DOCTOR
- SUPER_ADMIN + DENTIST
- ANON

Negative tests must include:

1. Patient A cannot access Patient B.
2. ADMIN alone cannot access clinical PHI.
3. SUPER_ADMIN alone cannot access clinical PHI.
4. ADMIN + DOCTOR can access only authorized medical encounters.
5. ADMIN + DENTIST can access only authorized dental encounters.
6. Doctor cannot SELECT dental records.
7. Dentist cannot SELECT medical records.
8. Nurse cannot access unrelated encounters.
9. Cross-clinic provider access fails.
10. Expired provider assignment fails.
11. Inactive provider fails.
12. UUID IDOR attempts fail.
13. Finalized record UPDATE fails.
14. Finalized record DELETE fails.
15. Invalid status transition fails.
16. Concurrent final-unit pharmacy dispensing allows only one success.
17. Queue concurrency produces unique queue numbers.
18. Anonymous users cannot SELECT clinical tables.
19. Anonymous QR verification returns minimal metadata only.
20. Audit UPDATE/DELETE fails.
21. Unauthorized SECURITY DEFINER execution fails.
22. Unauthorized report/export fails.
23. Storage access without record authorization fails.
24. AI cannot bypass authorization or execute arbitrary SQL.

---

# 51. THREAT MODEL

The architecture explicitly considers threats including:

- privilege escalation;
- IDOR;
- cross-patient access;
- cross-clinic access;
- cross-specialty access;
- administrative-to-clinical privilege leakage;
- RLS bypass;
- SECURITY DEFINER abuse;
- function EXECUTE abuse;
- JWT manipulation;
- profile field mass assignment;
- audit-log tampering;
- finalized-record tampering;
- pharmacy race conditions;
- queue race conditions;
- QR enumeration;
- PHI leakage;
- storage exposure;
- export leakage;
- Realtime side channels;
- PWA cache leakage;
- AI prompt/data leakage;
- AI autonomous clinical decisions;
- break-glass abuse;
- session/account misuse.

---

# 52. AI SECURITY BOUNDARY

AI access must use predefined, authorization-aware functions.

AI must never receive unrestricted database access.

Preferred architecture:

```text
Authorized User
      ↓
Application Authorization
      ↓
Controlled AI Function
      ↓
Minimal Necessary Data
      ↓
AI Model
      ↓
Draft Result
      ↓
Human Review
      ↓
Approved Clinical Record
```

The AI layer is never the security boundary.

---

# 53. BUSINESS CONTINUITY

The production design should provide:

- database backups;
- recovery procedures;
- environment separation;
- migration rollback planning where feasible;
- audit preservation;
- monitoring;
- error logging;
- operational recovery procedures.

Backup and disaster-recovery objectives must be finalized according to the university's infrastructure policy.

---

# 54. EXTENSIBILITY

The architecture must support future modules without redesigning the security foundation.

Potential future modules:

- laboratory integration;
- immunization;
- laboratory results;
- additional diagnostic services;
- appointment scheduling;
- telemedicine;
- campus expansion;
- external referral integration;
- SIS/HRIS integration;
- advanced population health analytics;
- SMS notifications;
- additional clinic services.

Future modules must inherit the same authorization and privacy principles.

---

# 55. SIS/HRIS INTEGRATION

UCIS initially remains logically independent from the SIS/HRIS database.

External identifiers can be stored for reference/integration.

The architecture should support future controlled integration through APIs or synchronization services.

Identity synchronization must not create conflicting authoritative identities.

UCIS must define which system is authoritative for each identity attribute.

---

# 56. DESIGN PRINCIPLES

The following principles are mandatory:

1. Security is enforced at the database boundary.
2. Frontend authorization is never sufficient.
3. Least privilege is the default.
4. ADMIN does not equal clinical access.
5. Provider assignment determines clinical scope.
6. Administrative scope cannot substitute for clinical scope.
7. Medical and dental authority are separated.
8. Clinical records are immutable after finalization.
9. Corrections use amendments.
10. Inventory operations are transactional.
11. Queue numbering is atomic.
12. Anonymous verification exposes minimal information.
13. Audit records are append-only.
14. Sensitive storage is private.
15. AI is advisory and human-controlled.
16. Sensitive information is minimized.
17. Invalid states are rejected at the database layer.
18. The system fails closed.
19. Every sensitive capability has negative security tests.
20. Production migration requires explicit human approval.

---

# 57. APPROVED FEATURE CHECKLIST

## Core
- [x] University clinic management
- [x] Medical clinic
- [x] Dental clinic
- [x] Multi-campus-ready architecture
- [x] Mobile-first PWA
- [x] Walk-in workflow
- [x] Queue management
- [x] Patient records
- [x] Longitudinal EMR
- [x] Dental history
- [x] Odontogram

## Medical
- [x] Consultation
- [x] First aid
- [x] Emergency documentation
- [x] Vital signs
- [x] FBS
- [x] Prescription
- [x] Dispensing
- [x] Referral
- [x] Follow-up
- [x] Medical certificate
- [x] Medical clearance
- [x] Incident/injury records

## Dental
- [x] Dental consultation
- [x] Oral assessment
- [x] Cleaning
- [x] Extraction
- [x] Filling/restoration
- [x] Dental referral
- [x] Dental clearance
- [x] Dental history
- [x] Odontogram

## Pharmacy
- [x] Medicine master
- [x] Batch management
- [x] Expiration tracking
- [x] Inventory
- [x] Stock-in/out
- [x] Dispensing
- [x] Reorder alerts
- [x] Inventory reports
- [x] Transactional concurrency protection

## Documents
- [x] Certificates
- [x] Clearances
- [x] Prescriptions
- [x] Referrals
- [x] Consultation records
- [x] Dental records
- [x] Incident records
- [x] Health certificates
- [x] QR verification

## Reporting
- [x] Daily
- [x] Weekly
- [x] Monthly
- [x] Semester
- [x] Academic year
- [x] Custom date range
- [x] Excel
- [x] PDF
- [x] CSV

## Security
- [x] RBAC
- [x] Permission + scope
- [x] PostgreSQL RLS
- [x] Provider assignment authorization
- [x] Cross-specialty isolation
- [x] Patient isolation
- [x] Audit logging
- [x] Login history
- [x] Export auditing
- [x] Private storage
- [x] QR isolation
- [x] Immutable finalized records
- [x] Amendments
- [x] Controlled status transitions
- [x] Soft-delete/lifecycle approach
- [x] Break-glass model
- [x] SECURITY DEFINER governance
- [x] Fail-closed authorization

## AI
- [x] History summarization
- [x] Documentation assistance
- [x] Trend analysis
- [x] Red-flag support
- [x] Follow-up support
- [x] Population analytics
- [x] Disease surveillance support
- [x] Natural-language dashboard queries
- [x] Human-in-the-loop approval
- [x] AI audit trail
- [x] No autonomous diagnosis
- [x] No autonomous prescription
- [x] No autonomous clearance
- [x] No arbitrary SQL

---

# 58. NON-GOALS FOR INITIAL RELEASE

The following are intentionally excluded from the initial release:

- online appointment booking;
- autonomous AI diagnosis;
- autonomous AI prescribing;
- autonomous AI clearance decisions;
- unrestricted public patient lookup;
- public access to clinical documents;
- direct SIS/HRIS database coupling;
- full laboratory information system;
- unrestricted offline clinical records;
- arbitrary SQL through AI;
- unrestricted clinic-wide clinical access for administrative users.

---

# 59. ARCHITECTURE GOVERNANCE

Any future change to the following requires architecture review:

- roles;
- permissions;
- RLS policies;
- clinical scope;
- provider assignments;
- patient identity;
- finalized-record behavior;
- pharmacy transactions;
- document verification;
- SECURITY DEFINER functions;
- storage authorization;
- AI database access;
- Realtime access;
- report/export access.

No feature should be added solely at the UI layer if it changes authorization, data integrity, or clinical workflow.

---

# 60. FINAL ARCHITECTURE BASELINE

The approved target architecture is:

```text
                    ┌──────────────────────────────┐
                    │        UCIS PWA / Web        │
                    │       Next.js + TypeScript   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     Application Services     │
                    │  Auth-aware business logic   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────────┐
              │       Supabase PostgreSQL Security         │
              │                                            │
              │  Constraints + Functions + Triggers + RLS │
              │                                            │
              │  Permission + Scope + Specialization      │
              └──────────────┬─────────────────────────────┘
                             │
              ┌──────────────┼───────────────────┐
              ▼              ▼                   ▼
       ┌────────────┐ ┌──────────────┐   ┌──────────────┐
       │ Supabase   │ │ Supabase     │   │ Private      │
       │ Auth       │ │ PostgreSQL   │   │ Storage      │
       └────────────┘ └──────────────┘   └──────────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ Audit / Reporting │
                    │ / AI / Analytics  │
                    └───────────────────┘
```

The authoritative clinical security path is:

```text
User
 ↓
Authentication
 ↓
Active User Profile
 ↓
Clinical Role + Permission
 ↓
Active Provider Profile
 ↓
Provider Type
 ↓
Active Provider Assignment
 ↓
Clinic
 ↓
Service
 ↓
Effective Dates
 ↓
Encounter
 ↓
Target Clinical Record
```

---

# 61. PRODUCTION READINESS RULE

This document is the **approved target feature and architecture baseline**.

It must not be interpreted as proof that the actual database implementation is production-safe.

Production migration may begin only after:

```text
Architecture Approved
        AND
All Critical Findings Resolved
        AND
All High Findings Resolved
        AND
Complete RLS Matrix
        AND
SECURITY DEFINER Catalog + EXECUTE Grants
        AND
Constraints/Triggers Defined
        AND
Transaction Boundaries Defined
        AND
Executable Negative Security Tests
        AND
Migration Dependency Graph
        AND
Independent Re-Audit PASS
        AND
Human Architecture Approval
```

Only then:

```text
Generate Production SQL
        ↓
Create Supabase Migrations
        ↓
Apply to Development
        ↓
Run Security Tests
        ↓
Staging Validation
        ↓
Production Approval
        ↓
Production Deployment
```

---

# 62. CURRENT GOVERNANCE STATUS

**TARGET FEATURES:** APPROVED  
**TARGET ARCHITECTURE:** APPROVED AS THE BASELINE  
**PRODUCTION DATABASE:** NOT CREATED  
**PRODUCTION SQL:** NOT AUTHORIZED BY THIS DOCUMENT  
**MIGRATIONS:** NOT AUTHORIZED BY THIS DOCUMENT  
**LIVE SUPABASE DATABASE:** NOT MODIFIED  
**SECURITY IMPLEMENTATION:** MUST BE VERIFIED  
**INDEPENDENT SECURITY GATE:** REQUIRED  
**HUMAN PRODUCTION APPROVAL:** REQUIRED

---

## END OF UCIS APPROVED FEATURES & TARGET ARCHITECTURE BASELINE
