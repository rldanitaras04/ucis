# UNIVERSITY CLINIC INFORMATION SYSTEM (UCIS)

## REVISED DATABASE ARCHITECTURE, AUTHORIZATION, RLS, DATA-INTEGRITY AND SECURITY SPECIFICATION

**Status:** PRE-MIGRATION / ARCHITECTURE FREEZE
**Implementation Stack:** Next.js + TypeScript + Supabase PostgreSQL + Supabase Auth + Supabase Storage + Vercel
**Database:** PostgreSQL
**Security Model:** PostgreSQL-first authorization with RLS
**Implementation Agent:** MiMo
**Production Migration Status:** **BLOCKED UNTIL ALL GATES PASS**

---

# 0. ABSOLUTE IMPLEMENTATION RULE

MiMo MUST NOT generate, modify, or execute a production database migration until this specification has been completely validated.

The following are explicitly prohibited before architectural approval:

* creating production tables
* creating production RLS policies
* creating production functions
* creating production triggers
* creating production Storage policies
* creating seed migrations
* creating indexes intended for production
* modifying `supabase/migrations/*`
* applying SQL to the production Supabase project

MiMo may create only:

1. architecture documentation
2. ERD
3. data dictionary
4. authorization specification
5. RLS policy specification
6. constraint specification
7. database-function specifications
8. trigger specifications
9. executable security-test specifications
10. migration dependency graph
11. identified risks and unresolved questions

**STOP after producing these artifacts.**

Do not generate SQL until the final architecture review explicitly authorizes it.

---

# 1. AUTHORITATIVE SECURITY PRINCIPLE

The PostgreSQL database is the authoritative authorization boundary.

The application layer is considered untrusted.

Architecture:

```text
User
 ↓
Supabase Auth
 ↓
JWT / auth.uid()
 ↓
Next.js Application
 ↓
Supabase API / PostgREST
 ↓
PostgreSQL RLS
 ↓
Database Constraints
 ↓
Database Functions / RPC
 ↓
Triggers / Invariants
 ↓
PostgreSQL Data
```

Application-level checks are useful for UX and defense-in-depth but MUST NOT be considered the final authorization mechanism.

Never rely solely on:

* Next.js middleware
* client-side role checks
* hidden buttons
* route protection
* TypeScript types
* Zod validation
* server component authorization
* server action authorization

RLS and database constraints remain authoritative.

---

# 2. CRITICAL ROLE MODEL

The system has these roles:

```text
SUPER_ADMIN
ADMIN
DOCTOR
DENTIST
NURSE
CLINIC_STAFF
STUDENT
FACULTY
NON_TEACHING_STAFF
```

## 2.1 Critical Separation

### SUPER_ADMIN / ADMIN ≠ Clinical

Administrative authority MUST NOT automatically grant clinical-record access.

A user with:

```text
ADMIN
```

must NOT automatically gain access to:

* medical records
* dental records
* FBS records
* prescriptions
* clinical assessments
* diagnoses
* treatment notes
* patient health profiles
* odontograms
* clinical referrals
* clinical clearances

unless the user separately possesses an explicitly authorized clinical role.

Example:

```text
User A
 └── ADMIN

Result:
Administrative access only.
No clinical access.
```

Example:

```text
User B
 ├── ADMIN
 └── DOCTOR

Result:
Administrative access
+
doctor clinical access
```

Clinical access MUST be evaluated from the relevant clinical role and clinical assignment, not merely from the presence of `ADMIN`.

---

# 3. ROLE ≠ PERMISSION ≠ SCOPE

These three concepts MUST remain separate.

## Role

Defines organizational capability.

Examples:

```text
doctor
dentist
nurse
clinic_staff
admin
```

## Permission

Defines an action.

Examples:

```text
patients.view
patients.create
encounters.create
medical_records.finalize
medical_records.amend
prescriptions.create
dispensing.create
reports.export
audit_logs.view
```

## Scope

Defines where/which records the permission applies to.

Possible scopes:

```text
OWN_PATIENT
ASSIGNED_PATIENT
ASSIGNED_ENCOUNTER
CLINIC
CAMPUS
UNIVERSITY
SYSTEM
```

Never implement a generic:

```text
role = admin → ALL
```

rule for clinical tables.

---

# 4. AUTHORIZATION HIERARCHY

The authoritative relationship is:

```text
auth.users
   ↓
user_profiles
   ↓
user_roles
   ↓
roles
   ↓
role_permissions
   ↓
permissions
```

For clinical authorization:

```text
auth.users
   ↓
user_profiles
   ↓
provider_profiles
   ↓
provider_assignments
   ↓
clinic
   ↓
clinic_service
   ↓
encounter
   ↓
clinical record
```

A clinical provider is authorized only when the complete chain is valid.

---

# 5. PROVIDER AUTHORIZATION MUST BE ASSIGNMENT-BASED

The existing concept of:

```text
is_provider_for_encounter()
```

is insufficient if it checks only whether the user's provider profile matches `encounters.provider_id`.

Authorization MUST validate:

```text
current user
+
provider profile
+
provider type
+
active provider assignment
+
clinic
+
service
+
effective dates
+
encounter
```

Conceptually:

```text
User
 ↓
Provider Profile
 ↓
Provider Type
 ↓
Active Provider Assignment
 ↓
Clinic
 ↓
Service
 ↓
Encounter
```

A provider MUST NOT gain access merely because:

```text
encounters.provider_id = provider_profile.id
```

The assignment must be active and valid for the relevant clinic/service/date.

---

# 6. DOCTOR / DENTIST SEPARATION

The database MUST enforce clinical specialization.

## Doctor

Can create/manage:

```text
medical encounters
medical records
prescriptions
medical referrals
medical clearances
medical certificates
```

Cannot create/update:

```text
dental_records
odontogram_records
dental_procedures
```

## Dentist

Can create/manage:

```text
dental encounters
dental records
odontograms
dental procedures
dental referrals
dental clearances
dental certificates
```

Cannot create/update:

```text
medical_records
medical prescriptions
```

The separation MUST be enforced using database authorization and integrity constraints.

Do not rely only on frontend role guards.

---

# 7. CLINIC SERVICE MODEL

`clinic_services` is authoritative for what a clinic provides.

Every service MUST belong to exactly one clinic.

Example:

```text
Clinic A
 ├── MEDICAL
 ├── DENTAL
 └── FBS
```

Provider assignments MUST reference an explicit service.

## IMPORTANT

Do NOT use:

```text
service_id = NULL
```

to mean:

```text
provider can access every service
```

This is too permissive.

Every provider assignment should explicitly identify the service.

If broad access is ever required, it must be represented by an explicit permission/scope mechanism rather than NULL semantics.

---

# 8. ORGANIZATIONAL SCOPE

Hierarchy:

```text
University
 └── Campus
      └── Clinic
           └── Service
                └── Provider Assignment
```

Every relevant clinical record must be traceable to its organizational scope.

Where necessary, records should contain:

```text
clinic_id
```

or derive it through an immutable relationship.

Never infer authorization from user-provided text.

---

# 9. USER PROFILE SECURITY

`user_profiles` contains security-sensitive attributes.

The following fields MUST NOT be directly self-editable:

```text
auth_user_id
user_type
employee_student_id
campus_id
status
roles
```

Users may update only explicitly approved profile fields such as:

```text
first_name
middle_name
last_name
suffix
contact_number
```

depending on institutional policy.

Do NOT implement:

```text
UPDATE user_profiles
SET ...
WHERE auth_user_id = auth.uid()
```

without restricting columns.

Preferred architecture:

```text
user_profiles
 ├── SECURITY-CONTROLLED FIELDS
 └── USER-EDITABLE PROFILE FIELDS
```

or expose a controlled RPC:

```text
update_my_profile(...)
```

that explicitly updates only permitted fields.

---

# 10. PATIENT PROFILE ONE-TO-ONE INVARIANT

The architecture defines:

```text
user_profiles → patient_profiles
```

as one-to-zero-or-one.

Therefore:

```text
patient_profiles.user_profile_id
```

MUST have a unique constraint/index.

Recommended:

```text
UNIQUE(user_profile_id)
```

or an appropriate partial unique index if NULL values are permitted.

A single authenticated user must never map to multiple patient profiles.

---

# 11. PATIENT IDENTITY SOURCE OF TRUTH

Avoid uncontrolled duplication of identity fields.

The architecture currently contains identity information in both:

```text
user_profiles
patient_profiles
```

Define the source of truth explicitly.

Recommended:

### Authentication identity

`auth.users`

### Application identity

`user_profiles`

### Clinical patient identity

`patient_profiles`

For linked users:

```text
patient_profiles.user_profile_id
```

must identify the corresponding application user.

Duplicated fields such as name, email, department, campus and identifiers must have clearly defined ownership.

Do not allow contradictory values to be silently maintained.

---

# 12. PATIENT IDENTITY INVARIANTS

Where a patient is linked to a user profile, define rules for:

```text
patient_type
user_type
campus
university identifier
```

The database must either:

1. enforce consistency, or
2. clearly define which table is authoritative.

Do not leave this ambiguous.

---

# 13. WALK-IN PATIENT SUPPORT

Walk-in patients may exist without an authenticated user account.

Therefore:

```text
patient_profiles.user_profile_id
```

may be NULL.

However:

```text
university_id
```

and other institutional identifiers must follow clearly defined uniqueness and identification rules.

Walk-in patients MUST NOT automatically receive authenticated self-service access until a verified account association exists.

---

# 14. ENCOUNTER AS THE CENTRAL CLINICAL EVENT

`encounters` is the central clinical event.

Every encounter must maintain consistent relationships between:

```text
patient
clinic
service
provider
queue entry
encounter type
```

The database MUST prevent inconsistent combinations such as:

```text
Queue:
Clinic A
Patient A
Dental Service

Encounter:
Clinic B
Patient B
Medical Service
```

Therefore enforce cross-table invariants.

---

# 15. ENCOUNTER CONSISTENCY

At minimum:

```text
encounters.patient_id
    =
queue_entries.patient_id
```

when a queue entry is associated.

And:

```text
encounters.clinic_id
    =
queue_entries.clinic_id
```

And:

```text
encounters.service_id
    =
queue_entries.service_id
```

Provider assignment must be compatible with:

```text
encounter.clinic_id
encounter.service_id
encounter.encounter_type
```

The database MUST reject inconsistent relationships.

---

# 16. QUEUE NUMBER GENERATION

The existing approach:

```sql
MAX(queue_number) + 1
```

is NOT acceptable for production concurrency.

Two simultaneous transactions can produce the same number.

Implement a dedicated concurrency-safe mechanism.

Recommended:

```text
queue_counters
```

with a unique key:

```text
clinic_id
service_id
queue_date
```

Use transactional row locking / atomic increment.

Required uniqueness:

```text
(clinic_id, service_id, queue_date, queue_number)
```

The queue number generator MUST be atomic.

---

# 17. QUEUE ENTRY AUTHORIZATION

Patient:

```text
read own queue entry
```

Clinic staff/nurse:

```text
manage queue within assigned clinic
```

Doctor/dentist:

```text
view queue entries for explicitly authorized services/clinic
```

Do not grant:

```text
doctor → ALL queue entries
```

unless their explicit clinic/service scope supports it.

---

# 18. MEDICAL RECORD FINALIZATION

A finalized medical record is immutable.

Once:

```text
status = finalized
```

NO direct UPDATE may modify ANY clinical or audit-relevant field.

The current trigger is insufficient because it checks only selected fields.

The protection must cover the entire record.

After finalization:

```text
DIRECT UPDATE = DENY
```

including changes to:

```text
history_of_present_illness
past_medical_history
allergies_review
current_medications_review
physical_examination
clinical_assessment
diagnosis
diagnosis_code
treatment
advice
status
finalized_at
finalized_by
created_by
encounter_id
patient_id
```

and any future clinical fields.

---

# 19. MEDICAL RECORD AMENDMENT MODEL

Corrections must use an explicit amendment workflow.

Conceptually:

```text
Finalized Record
      ↓
Amendment Request
      ↓
Authorized Provider
      ↓
Reason Required
      ↓
Original Snapshot Preserved
      ↓
Corrected Data
      ↓
Amendment Audit Event
```

An amendment MUST capture:

```text
medical_record_id
amended_by
amended_at
reason
original_data
corrected_data
```

Preferably also:

```text
changed_fields
correlation_id
```

The original finalized record must remain historically reconstructable.

---

# 20. DENTAL RECORD FINALIZATION

Apply the same immutable architecture to:

```text
dental_records
```

Once finalized:

```text
DIRECT UPDATE = DENY
```

All fields must be protected, not merely:

```text
examination_findings
treatment_plan
notes
```

Use a dedicated amendment mechanism.

If dental amendments are required, create:

```text
dental_record_amendments
```

rather than incorrectly reusing the medical amendment table.

---

# 21. ODONTOGRAM IS HISTORICAL

Odontogram records are events.

Never overwrite historical tooth conditions.

Preferred model:

```text
patient
 └── tooth event history
       ├── condition
       ├── surface
       ├── encounter
       ├── recorded_by
       └── recorded_at
```

Current tooth state is derived from the latest valid record.

Historical events remain immutable.

---

# 22. PHARMACY INVENTORY MUST BE TRANSACTIONAL

Inventory must never depend on an unsafe sequence such as:

```text
SELECT stock
INSERT dispensing
UPDATE stock
```

without transaction-level protection.

Dispensing MUST occur through a controlled transactional operation.

Conceptually:

```text
BEGIN
 ↓
LOCK prescription item
 ↓
LOCK eligible medicine batch
 ↓
verify prescription status
 ↓
verify batch medicine
 ↓
verify expiration
 ↓
verify available quantity
 ↓
deduct quantity
 ↓
create dispensing record
 ↓
create inventory transaction
 ↓
update prescription item
 ↓
audit
 ↓
COMMIT
```

Two simultaneous dispensings of the final unit must never both succeed.

---

# 23. INVENTORY SOURCE OF TRUTH

Avoid ambiguous dual-write behavior.

Define whether:

```text
medicine_batches.quantity_on_hand
```

is:

1. authoritative state updated transactionally, or
2. derived entirely from inventory transactions.

Do not allow unrestricted application writes to both.

Recommended:

```text
medicine_batches.quantity_on_hand
```

is maintained only through controlled inventory operations.

---

# 24. INVENTORY TRANSACTION INTEGRITY

Every inventory transaction must preserve:

```text
quantity_before
quantity_change
quantity_after
```

with the invariant:

```text
quantity_after = quantity_before + quantity_change
```

The database must reject fabricated values.

Never trust the client to submit:

```text
quantity_before
quantity_after
```

as authoritative values.

They must be calculated by the database transaction.

---

# 25. MEDICINE BATCH EXPIRY

Dispensing must reject:

```text
expired
recalled
inactive
```

batches.

Preferred selection:

```text
active
AND expiration_date >= CURRENT_DATE
AND quantity_on_hand > 0
```

Use FEFO where appropriate:

```text
First Expired, First Out
```

---

# 26. PRESCRIPTION INTEGRITY

A prescription item must belong to its prescription.

The prescription must belong to:

```text
patient
encounter
authorized provider
```

The prescribed medicine must correspond to:

```text
medicine_id
```

Dispensing must validate:

```text
prescription_item
patient
medicine
quantity
prescription status
```

Do not allow a user to dispense an arbitrary medicine batch merely by knowing its UUID.

---

# 27. FBS MODULE

FBS records are clinical data.

Access must follow patient/clinical authorization.

Automated flags such as:

```text
normal
borderline
high
very_high
low
```

are informational classifications only.

They MUST NOT represent an autonomous diagnosis.

The UI and database documentation must explicitly distinguish:

```text
measurement
reference classification
clinical diagnosis
```

---

# 28. PRIVACY CONSENT

Consent history is append-only.

Never overwrite historical consent.

However, patients MUST NOT be allowed to fabricate:

```text
consented_at
created_by
source
withdrawn_at
```

Use controlled operations.

Example:

```text
record_consent(...)
withdraw_consent(...)
```

with server-controlled timestamps and actor identity.

---

# 29. DOCUMENT VERIFICATION / QR

Anonymous QR verification MUST NOT have direct table access.

Do NOT implement:

```text
anon SELECT document_verifications
anon INSERT document_verifications
```

The public endpoint must invoke a narrowly scoped verification function.

Conceptually:

```text
Anonymous Request
 ↓
verify_public_document(code)
 ↓
validate token
 ↓
lookup document
 ↓
check validity
 ↓
return minimal metadata
```

Return ONLY:

```text
document_type
document_control_number
issued_at
status
valid_until
institution
```

Never return:

```text
patient_id
patient name
diagnosis
clinical notes
prescription
address
contact number
```

The verification code itself must be high entropy and non-sequential.

---

# 30. PUBLIC QR AUDIT LOGGING

Public verification attempts may be logged.

However, the anonymous caller must NOT be given INSERT access to the audit table.

The server-side verification function performs the logging.

Therefore:

```text
anon
    ↓
RPC only
    ↓
verification logic
    ↓
server-side audit insertion
```

---

# 31. AUDIT LOG SECURITY

`audit_logs` is append-only.

No application role may:

```text
UPDATE
DELETE
```

audit records.

Audit insertion must be controlled.

However, PostgreSQL table triggers cannot automatically audit ordinary SELECT operations.

Therefore the architecture MUST NOT claim that a normal table trigger provides read-access auditing.

For sensitive reads, use controlled server-side functions or explicit application/server audit instrumentation.

---

# 32. AUDIT LOG CONTENT

Do NOT routinely store complete PHI in:

```text
old_values
new_values
```

Prefer:

```text
changed_fields
record identifiers
actor
timestamp
action
reason
correlation_id
```

Avoid unnecessary duplication of:

```text
diagnoses
clinical notes
medical histories
prescriptions
```

inside audit records.

---

# 33. REPORTING SECURITY

Reporting views must be explicitly authorized.

Do not assume that a view automatically inherits the desired patient-level security semantics.

Define:

```text
report scope
role
clinic scope
campus scope
aggregation level
export permission
```

Population reports should use aggregate/de-identified information whenever possible.

Exports are auditable actions.

---

# 34. AI SECURITY MODEL

AI MUST NEVER receive unrestricted database access.

The AI subsystem must NOT accept arbitrary SQL generated from natural language.

Forbidden architecture:

```text
User
 ↓
AI
 ↓
Generated SQL
 ↓
Database
```

Required architecture:

```text
User
 ↓
Authorized AI feature
 ↓
Authorization check
 ↓
Predefined database operation
 ↓
RLS / scope enforcement
 ↓
Minimal required data
 ↓
AI processing
 ↓
Draft result
 ↓
Human review
```

Examples of allowed controlled functions:

```text
get_patient_history()
get_encounter_summary()
get_patient_health_trend()
get_clinic_statistics()
get_population_statistics()
```

Natural-language queries must map to an allowlisted set of functions/queries.

Never expose:

```text
service_role
database password
arbitrary SQL execution
RLS bypass
```

to the AI.

---

# 35. AI CLINICAL SAFETY

AI may assist with:

```text
summary
documentation assistance
history summarization
red-flag suggestions
follow-up assistance
trend visualization
population analytics
```

AI MUST NOT independently:

```text
diagnose
prescribe
issue medical clearance
issue dental clearance
change clinical records
finalize records
approve treatment
```

Clinical AI outputs are drafts until approved by an authorized provider.

AI actions must be auditable.

---

# 36. STORAGE SECURITY

Clinical documents belong in private Storage buckets.

Never make clinical documents public.

Access should follow:

```text
patient ownership
provider assignment
clinic scope
document authorization
```

Use short-lived signed URLs.

Do not expose permanent public URLs to clinical files.

---

# 37. SECURITY DEFINER FUNCTIONS

Every `SECURITY DEFINER` function MUST:

1. explicitly define `search_path`
2. qualify object names
3. validate `auth.uid()`
4. fail closed
5. expose only required arguments
6. avoid arbitrary SQL
7. have carefully defined EXECUTE privileges
8. be reviewed for RLS bypass
9. avoid leaking unauthorized data

Do not automatically grant EXECUTE to:

```text
anon
authenticated
```

unless explicitly required.

---

# 38. RLS HELPER FUNCTION MODEL

Create centralized authorization functions such as:

```text
current_user_id()
get_user_profile_id()
has_role()
has_permission()
get_user_clinic_ids()
get_user_campus_ids()
get_patient_id_for_user()
is_patient_owner()
is_provider_assigned_to_encounter()
is_provider_assigned_to_patient()
is_user_in_clinic_scope()
```

But each helper must have a precise contract.

Do not use vague functions such as:

```text
is_provider_for_encounter()
```

if they do not verify the complete authorization chain.

---

# 39. FAIL-CLOSED RULE

For:

```text
NULL auth.uid()
NULL user_profile
inactive user
inactive role
inactive assignment
expired assignment
missing clinic scope
missing patient ownership
```

the authorization result must be:

```text
DENY
```

Never:

```text
ALLOW
```

because of NULL semantics.

---

# 40. RLS POLICY DESIGN RULE

Every policy must answer:

```text
WHO?
WHAT ACTION?
WHICH RESOURCE?
WHAT SCOPE?
WHY AUTHORIZED?
```

Do not write policies based merely on role names.

Example:

```text
doctor SELECT medical_records
```

is incomplete.

Correct concept:

```text
doctor
AND active provider
AND provider type = doctor
AND encounter is assigned to provider
AND record belongs to encounter
```

---

# 41. REVISED HIGH-LEVEL RLS MATRIX

## Patient Roles

| Resource            | Student             | Faculty             | Non-Teaching        |
| ------------------- | ------------------- | ------------------- | ------------------- |
| Own profile         | Read/update limited | Read/update limited | Read/update limited |
| Own encounters      | Read                | Read                | Read                |
| Own medical records | Read                | Read                | Read                |
| Own dental records  | Read                | Read                | Read                |
| Own FBS             | Read                | Read                | Read                |
| Own prescriptions   | Read                | Read                | Read                |
| Own clearances      | Read                | Read                | Read                |
| Own documents       | Read                | Read                | Read                |
| Other patients      | DENY                | DENY                | DENY                |

---

# 42. NURSE

Nurse access requires:

```text
NURSE role
+
active clinic assignment
```

Permitted:

```text
queue within clinic
patient registration/verification as authorized
vitals
FBS
assigned encounters
appropriate clinical history
follow-up
aggregate reports
```

Not permitted:

```text
medical record modification
dental record modification
role administration
system configuration
audit modification
```

---

# 43. CLINIC STAFF

Clinic Staff may:

```text
register patients
manage queue
view operational patient information
manage dispensing where authorized
manage inventory operations where explicitly permitted
manage documents where authorized
```

Clinic Staff MUST NOT automatically access:

```text
medical clinical notes
dental clinical notes
diagnoses
clinical assessments
```

Operational access and clinical access must remain separate.

---

# 44. DOCTOR

Doctor requires:

```text
DOCTOR role
+
provider profile
+
provider_type = doctor
+
active clinic/service assignment
```

May access:

```text
assigned medical encounters
assigned medical records
relevant patient history
vitals
FBS
prescriptions
medical referrals
medical follow-ups
medical clearances
medical certificates
```

Cannot modify dental records.

---

# 45. DENTIST

Dentist requires:

```text
DENTIST role
+
provider profile
+
provider_type = dentist
+
active clinic/service assignment
```

May access:

```text
assigned dental encounters
dental records
odontograms
dental procedures
relevant patient history
dental referrals
dental follow-ups
dental clearances
dental certificates
```

Cannot modify medical records or prescriptions.

---

# 46. ADMIN

Admin may manage:

```text
users
administrative configuration
clinic configuration
inventory administration
announcements
reports within authorized administrative scope
audit viewing where permitted
```

Admin MUST NOT automatically access:

```text
medical records
dental records
FBS clinical details
clinical assessments
diagnoses
prescriptions
patient health profiles
```

unless an explicit clinical role is also assigned.

---

# 47. SUPER ADMIN

Super Admin may manage:

```text
system configuration
roles
permissions
user administration
organization configuration
security configuration
audit logs
system-level reports
```

But:

```text
SUPER_ADMIN ≠ automatic clinical authorization
```

A Super Admin who does not have a clinical role must not automatically receive unrestricted clinical record access.

This is a deliberate security boundary.

---

# 48. RLS MATRIX MUST BECOME MACHINE-READABLE

The conceptual matrix must be converted into a machine-testable authorization specification.

Every rule should be represented conceptually as:

```text
role
permission
table/resource
action
scope
expected result
```

Example:

```text
DOCTOR
medical_records
SELECT
ASSIGNED_ENCOUNTER
ALLOW
```

and:

```text
ADMIN
medical_records
SELECT
NO_CLINICAL_ROLE
DENY
```

and:

```text
ADMIN + DOCTOR
medical_records
SELECT
ASSIGNED_ENCOUNTER
ALLOW
```

---

# 49. DATABASE CONSTRAINTS BEFORE RLS

Before writing RLS, define all integrity constraints.

Required review categories:

```text
PK
FK
UNIQUE
CHECK
NOT NULL
cross-table invariants
date validity
status transitions
immutability
organizational consistency
role/provider consistency
```

RLS controls authorization.

Constraints control validity.

Do not use RLS to compensate for missing relational constraints.

---

# 50. CIRCULAR FOREIGN KEYS

The original design contains:

```text
queue_entries.encounter_id
```

and:

```text
encounters.queue_entry_id
```

This creates a circular dependency.

Do not create both foreign keys simultaneously in the initial table creation sequence.

Preferred approach:

1. create base tables
2. create nullable relationship
3. add second FK after both tables exist
4. enforce one-to-one relationship with unique constraint
5. add consistency checks/function where necessary

Document the exact dependency order before migration generation.

---

# 51. STATUS TRANSITIONS

Status fields are not merely UI values.

Define allowed transitions.

Example medical record:

```text
draft → finalized
finalized → amended
```

Do not allow:

```text
finalized → draft
finalized → arbitrary status
```

without a controlled amendment process.

Apply the same principle to:

```text
prescriptions
clearances
follow-ups
queue entries
documents
incidents
```

where applicable.

---

# 52. DELETE POLICY

Clinical data should not be physically deleted through ordinary application roles.

For clinical records:

```text
DELETE = DENY
```

Use controlled lifecycle states such as:

```text
archived
cancelled
revoked
inactive
```

where appropriate.

Audit records:

```text
DELETE = DENY
UPDATE = DENY
```

---

# 53. DOCUMENT CONTROL NUMBERS

Document control numbers must be generated atomically.

The sequence function must prevent duplicates under concurrent requests.

Gaps are acceptable.

Duplicates are not.

The function must not accept arbitrary sequence numbers from clients.

---

# 54. PUBLIC VERIFICATION TOKEN

Verification tokens must:

```text
be unpredictable
not expose patient identity
not encode PHI
not be sequential
be revocable
```

The public verification endpoint must be rate-limited at the application/infrastructure layer as defense-in-depth.

---

# 55. LOGIN HISTORY

Login history is security-sensitive.

Normal users should not receive unrestricted access to other users' login history.

Define precisely:

```text
own
security administrator
system security
```

scope.

IP addresses and user agents must be treated as sensitive security data.

---

# 56. REPORT EXPORT

Every export of sensitive data must be auditable.

Audit:

```text
actor
report type
scope
timestamp
filters
record count where appropriate
correlation ID
```

Do not store unnecessary PHI in export audit metadata.

---

# 57. REALTIME SECURITY

If Supabase Realtime is used:

* verify RLS behavior
* verify channel authorization
* verify clinic scoping
* verify patient isolation
* never expose unrestricted channels
* never use service-role credentials in the browser

Queue realtime updates must not become a side channel for unauthorized patient information.

---

# 58. STORAGE AUTHORIZATION

Storage policies must be reviewed separately from database RLS.

For every private clinical document:

```text
WHO CAN READ?
WHO CAN WRITE?
WHO CAN DELETE?
WHO CAN CREATE SIGNED URL?
```

The database `documents.file_path` must not itself grant access.

---

# 59. SECURITY TESTING REQUIREMENT

Conceptual comments such as:

```text
-- ASSERT 0 rows
```

are insufficient.

Tests MUST be executable.

Use either:

```text
pgTAP
```

or executable SQL test procedures/DO blocks with explicit assertions.

---

# 60. REQUIRED NEGATIVE TESTS

At minimum:

### Patient Isolation

```text
Student A → Student B profile = DENY
Student A → Student B medical record = DENY
Student A → Student B dental record = DENY
Student A → Student B FBS = DENY
```

### Provider Isolation

```text
Doctor → unassigned encounter = DENY
Doctor → another clinic encounter = DENY
Dentist → medical encounter = DENY
Doctor → dental encounter = DENY
```

### Administrative Separation

```text
Admin without clinical role → medical record = DENY
Admin without clinical role → dental record = DENY
Super Admin without clinical role → medical record = DENY
```

### Dual Role

```text
Admin + Doctor → authorized medical encounter = ALLOW
Admin + Doctor → unauthorized clinic = DENY
```

### Immutability

```text
finalized medical record UPDATE = DENY
finalized dental record UPDATE = DENY
```

### Inventory

```text
two concurrent dispenses of final unit
→ exactly one succeeds
```

### Expiry

```text
expired batch → dispensing = DENY
recalled batch → dispensing = DENY
```

### QR

```text
anon → patient data = DENY
anon → medical record = DENY
anon → public verification RPC = ALLOW
anon → verification table SELECT = DENY
anon → verification table INSERT = DENY
```

### IDOR

```text
knowing UUID alone → DENY
```

### Scope

```text
Clinic A provider → Clinic B data = DENY
Campus A admin → Campus B administrative data = DENY
```

---

# 61. SECURITY TEST FIX

Correct:

```text
request.jwt.claim.sub
```

Do NOT use:

```text
request.jwt.clain.sub
```

The test suite must use correct PostgreSQL/Supabase request settings.

---

# 62. TEST DATA MODEL

Security tests must use deterministic fictional users:

```text
student_a
student_b
doctor_a
doctor_b
dentist_a
nurse_a
clinic_staff_a
admin_a
super_admin_a
admin_doctor_a
```

and:

```text
clinic_a
clinic_b
campus_a
campus_b
```

Tests must explicitly construct cross-scope attack scenarios.

---

# 63. RLS COVERAGE REQUIREMENT

Every table must have:

```text
RLS enabled
```

and a documented policy for:

```text
SELECT
INSERT
UPDATE
DELETE
```

If no access is intended:

```text
DENY
```

must be explicitly documented.

No table may depend on undocumented default behavior.

---

# 64. POLICY COVERAGE CHECK

Before migration generation, MiMo must produce:

```text
TABLE × ROLE × ACTION × SCOPE
```

coverage.

For example:

```text
42 tables
×
9 roles
×
4 actions
```

does not necessarily mean every combination requires a policy, but every combination must have an explicit expected authorization result:

```text
ALLOW
DENY
CONTROLLED RPC
```

---

# 65. FUNCTION EXECUTE PRIVILEGES

For every database function, document:

```text
function name
security invoker/definer
search_path
arguments
return type
allowed caller roles
EXECUTE privilege
RLS interaction
possible data leakage
```

No function may accidentally become a database-wide bypass.

---

# 66. RPC SECURITY

Sensitive operations should use controlled RPCs where direct table mutation would be unsafe.

Candidate operations include:

```text
create_queue_entry()
create_encounter()
finalize_medical_record()
finalize_dental_record()
amend_medical_record()
amend_dental_record()
record_consent()
withdraw_consent()
dispense_prescription()
generate_document_control_number()
verify_public_document()
```

The exact RPC set must be finalized before migrations.

---

# 67. TRANSACTIONAL OPERATIONS

Operations requiring multiple coordinated writes must be atomic.

Examples:

```text
patient check-in
encounter creation
prescription creation
medicine dispensing
record amendment
document issuance
clearance issuance
```

If partial completion would create invalid clinical state, use a transaction.

---

# 68. DOCUMENT / CLEARANCE RELATIONSHIP

Clarify whether:

```text
clearances
certificate_requests
documents
```

represent:

1. business records
2. generated document metadata
3. document files

Do not duplicate verification state unnecessarily.

Define authoritative ownership for:

```text
control number
verification code
status
revocation
file path
```

---

# 69. DATA CLASSIFICATION

Maintain:

### PUBLIC

Examples:

```text
university name
clinic public information
clinic services
public announcements
```

### INTERNAL

Examples:

```text
administrative configuration
aggregate statistics
provider schedules
```

### CONFIDENTIAL

Examples:

```text
patient demographics
queue information
notifications
```

### HIGHLY CONFIDENTIAL

Examples:

```text
medical records
dental records
FBS
prescriptions
clearances
health profiles
clinical referrals
```

Classification must influence:

```text
RLS
Storage
logging
exports
AI access
```

---

# 70. MIGRATION ARCHITECTURE

The migration plan must be dependency-safe.

Before generating migrations, MiMo must produce a graph showing:

```text
table dependencies
function dependencies
trigger dependencies
RLS helper dependencies
RLS policy dependencies
view dependencies
Storage policy dependencies
seed dependencies
```

No migration may reference an object that has not yet been created.

Circular dependencies must be resolved explicitly.

---

# 71. MIGRATION PHASES

Recommended architecture:

```text
PHASE 1
Extensions

PHASE 2
Organizations

PHASE 3
Identity/Auth profiles

PHASE 4
Roles/permissions

PHASE 5
Providers

PHASE 6
Patients

PHASE 7
Clinic services

PHASE 8
Queue infrastructure

PHASE 9
Encounters

PHASE 10
Clinical records

PHASE 11
Pharmacy

PHASE 12
Documents

PHASE 13
System tables

PHASE 14
Authorization helper functions

PHASE 15
Business functions

PHASE 16
Triggers/invariants

PHASE 17
RLS enablement

PHASE 18
RLS policies

PHASE 19
Reporting

PHASE 20
Storage policies

PHASE 21
Development seed data

PHASE 22
Security tests
```

MiMo may adjust the exact number of migrations, but dependency correctness is mandatory.

---

# 72. NO PRODUCTION SEEDING OF REAL DATA

Seed data may contain only:

```text
fictional users
fictional patients
fictional clinics
fictional medicines
fictional encounters
```

Never include:

```text
real patient information
real health information
real credentials
real access tokens
```

---

# 73. RLS POLICY STYLE

Prefer explicit policies such as:

```text
SELECT
USING (...)

INSERT
WITH CHECK (...)

UPDATE
USING (...)
WITH CHECK (...)
```

Do not use broad policies such as:

```text
admin_all
```

on highly confidential clinical tables unless explicitly justified and reviewed.

---

# 74. ADMIN CLINICAL ACCESS OVERRIDE

There must be NO hidden administrative bypass.

Forbidden:

```text
is_admin() → unrestricted clinical SELECT
```

If an administrator also has a clinical role:

```text
is_admin()
```

is irrelevant to clinical authorization.

Clinical authorization must evaluate the clinical role and clinical assignment.

---

# 75. SUPER ADMIN BREAK-GLASS

If the institution eventually requires emergency administrative access to clinical records, it must be designed as a separate controlled capability.

Example:

```text
break_glass_clinical_access
```

requiring:

```text
explicit authorization
reason
time limitation
audit
possibly dual authorization
```

Do not implement this implicitly as `SUPER_ADMIN`.

---

# 76. PATIENT SELF-ACCESS

Patient access must be determined through:

```text
auth.uid()
 ↓
user_profiles
 ↓
patient_profiles
```

Never:

```text
patient_id supplied by browser
```

alone.

UUID knowledge is never authorization.

---

# 77. NO CLIENT-SIDE AUTHORIZATION TRUST

The client may display:

```text
Doctor Dashboard
Admin Dashboard
Patient Dashboard
```

but the database must still enforce the same restrictions.

A malicious client must not be able to:

```text
change role
change patient_id
change clinic_id
change provider_id
change campus_id
```

to gain access.

---

# 78. SERVER ROLE CLAIMS

Do not treat arbitrary client-provided JWT role claims as authoritative application authorization unless their issuance and lifecycle are controlled.

Prefer deriving authorization from database-backed role assignments where appropriate.

---

# 79. SECURITY DEFINER REVIEW GATE

Every SECURITY DEFINER function must be individually reviewed.

MiMo must produce a table:

| Function | Definer? | Why | Search Path | RLS Interaction | Caller | Risk |
| -------- | -------- | --- | ----------- | --------------- | ------ | ---- |

No function proceeds to production without review.

---

# 80. FINAL PRE-MIGRATION DELIVERABLES

Before writing ANY SQL migration, MiMo MUST produce:

## A. Final ERD

Including:

* PK
* FK
* cardinality
* unique constraints
* organizational scope
* clinical relationships

## B. Final Table Catalog

For every table:

```text
purpose
sensitivity
PK
FK
unique
checks
indexes
source of truth
immutability
```

## C. Final RBAC Matrix

```text
role
permission
resource
action
scope
```

## D. Final RLS Matrix

```text
table
role
SELECT
INSERT
UPDATE
DELETE
scope
```

## E. RLS Policy Pseudocode

Before SQL.

## F. Function Catalog

Including all security-definer functions.

## G. Trigger Catalog

Including:

```text
trigger
timing
event
function
invariant
failure behavior
```

## H. Transaction Catalog

Identify operations requiring atomic transactions.

## I. Security Test Specification

Executable-test design.

## J. Migration Dependency Graph

No unresolved circular dependencies.

## K. Threat Model

At minimum:

```text
IDOR
privilege escalation
role manipulation
cross-clinic access
cross-campus access
provider impersonation
patient isolation failure
RLS bypass
SECURITY DEFINER abuse
Storage leakage
AI data leakage
inventory race condition
finalized record tampering
QR enumeration
audit tampering
```

---

# 81. HARD STOP GATES

MiMo MUST NOT generate production SQL if ANY of the following remains unresolved:

```text
[ ] Admin clinical access ambiguity
[ ] Super Admin clinical access ambiguity
[ ] User profile privilege escalation
[ ] Patient/user one-to-one invariant
[ ] Provider assignment authorization
[ ] Doctor/dentist separation
[ ] Clinic/service consistency
[ ] Encounter integrity
[ ] Queue concurrency
[ ] Inventory concurrency
[ ] Finalized medical record immutability
[ ] Finalized dental record immutability
[ ] Amendment architecture
[ ] Consent integrity
[ ] QR public verification isolation
[ ] Audit read-access design
[ ] Reporting authorization
[ ] AI authorization boundary
[ ] SECURITY DEFINER review
[ ] Circular FK resolution
[ ] Executable RLS tests
[ ] Correct JWT test configuration
[ ] Complete table × role × action matrix
[ ] Storage authorization
[ ] Migration dependency graph
```

If any item is unresolved:

```text
STOP.
DO NOT GENERATE SQL.
```

---

# 82. REQUIRED FINAL ARCHITECTURE DECISION

MiMo must finish the architecture phase with exactly one of:

```text
ARCHITECTURE STATUS: APPROVED FOR MIGRATION
```

or:

```text
ARCHITECTURE STATUS: BLOCKED
```

If blocked, list:

```text
blocking issue
security impact
proposed resolution
affected tables
affected policies
affected functions
```

Do not proceed automatically.

---

# 83. FINAL SECURITY PRINCIPLE

The following must be true before production implementation:

```text
Knowing a UUID does not grant access.

Having ADMIN does not grant clinical access.

Having SUPER_ADMIN does not grant clinical access.

Having DOCTOR does not grant access to every patient.

Having DENTIST does not grant medical-record access.

Being a provider does not grant access outside active assignments.

Being assigned to Clinic A does not grant Clinic B access.

Being authenticated does not grant patient data access.

Client-side authorization cannot bypass database authorization.

SECURITY DEFINER functions cannot become unrestricted data APIs.

AI cannot bypass authorization.

QR verification cannot expose PHI.

Finalized records cannot be silently modified.

Inventory cannot become negative.

Concurrent dispensing cannot overspend stock.

Audit logs cannot be modified or deleted.

Historical clinical information remains reconstructable.
```

---

# 84. IMPLEMENTATION INSTRUCTION TO MIMO

**DO NOT GENERATE SQL YET.**

First perform a complete architecture reconciliation against this specification.

Compare every existing design element against:

```text
schema
constraints
relationships
RBAC
RLS
functions
triggers
transactions
Storage
AI
audit
testing
migration dependencies
```

For every discrepancy, provide:

```text
CURRENT DESIGN
PROBLEM
SECURITY/INTEGRITY IMPACT
REQUIRED CHANGE
AFFECTED OBJECTS
```

Then produce the complete pre-migration artifacts.

Only after all hard-stop gates are marked:

```text
PASS
```

may the architecture be presented for human approval.

Until that approval is explicitly provided:

```text
NO PRODUCTION MIGRATION SQL.
NO CREATE TABLE SQL.
NO CREATE POLICY SQL.
NO CREATE FUNCTION SQL.
NO TRIGGER SQL.
NO STORAGE POLICY SQL.
```

**This instruction overrides any previous request to generate migrations.**