# UCIS ARCHITECTURE RECONCILIATION & PRE-MIGRATION SECURITY AUDIT

## EXECUTIVE AUDIT VERDICT

**ARCHITECTURE STATUS: BLOCKED**

### Finding Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 8 |
| HIGH | 12 |
| MEDIUM | 9 |
| LOW | 5 |

---

## 1. HARD-STOP GATE EVALUATION

| Gate | Status | Notes |
|------|--------|-------|
| Admin clinical access ambiguity | PASS | Sections 2, 46, 74 clearly define ADMIN ≠ CLINICAL |
| Super Admin clinical access ambiguity | PASS | Sections 2, 47, 75 clearly define SUPER_ADMIN ≠ CLINICAL |
| User profile privilege escalation | PASS | Section 9 defines controlled fields |
| Patient/user one-to-one invariant | PASS | Section 10 defines UNIQUE constraint requirement |
| Provider assignment authorization | PASS | Section 5 defines full chain validation |
| Doctor/dentist separation | PASS | Section 6 defines clinical specialization |
| Clinic/service consistency | PASS | Section 7 defines explicit service requirement |
| Encounter integrity | PASS | Section 15 defines cross-table invariants |
| Queue concurrency | PASS | Section 16 defines atomic queue generation |
| Inventory concurrency | PASS | Section 22 defines transactional dispensing |
| Finalized medical record immutability | PASS | Section 18 defines complete field protection |
| Finalized dental record immutability | PASS | Section 20 defines complete field protection |
| Amendment architecture | PASS | Section 19 defines amendment workflow |
| Consent integrity | PASS | Section 28 defines controlled operations |
| QR public verification isolation | PASS | Section 29 defines RPC-only access |
| Audit read-access design | FAIL | Section 31 acknowledges limitation but no solution |
| Reporting authorization | FAIL | Section 33 defines requirements but no implementation |
| AI authorization boundary | PASS | Section 34 defines controlled functions |
| SECURITY DEFINER review | FAIL | Section 37 defines requirements but no catalog |
| Circular FK resolution | PASS | Section 50 defines migration strategy |
| Executable RLS tests | FAIL | Section 59 requires pgTAP but no specification |
| Correct JWT test configuration | FAIL | Section 61 identifies typo but no correction |
| Complete table × role × action matrix | FAIL | Section 48 requires matrix but none provided |
| Storage authorization | PASS | Section 58 defines requirements |
| Migration dependency graph | FAIL | Section 70 requires graph but none provided |

**Gates Passed: 18**
**Gates Failed: 6**

---

## 2. CRITICAL FINDINGS

### FINDING ID: ARCH-001

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 10 - Patient Profile One-to-One Invariant

**CURRENT DESIGN:**
```text
The architecture defines user_profiles → patient_profiles as one-to-zero-or-one.
Section 10 states: "patient_profiles.user_profile_id MUST have a unique constraint/index"
```

**REQUIREMENT:**
```text
UNIQUE(user_profile_id) constraint must be explicitly defined in table creation
```

**PROBLEM:**
The blueprint specifies the requirement but does not provide the actual table definition with the constraint. Without explicit SQL, the constraint may not be implemented.

**IMPACT:**
Multiple patient profiles could be linked to a single user, causing PHI exposure and authorization bypass.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide explicit table definition:
```sql
CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID UNIQUE REFERENCES user_profiles(id),
  -- other columns
);
```

**AFFECTED OBJECTS:**
- patient_profiles table

**REQUIRED TEST:**
Attempt to insert two patient_profiles with same user_profile_id → must fail

**STATUS:** OPEN

---

### FINDING ID: ARCH-002

**CATEGORY:** CONCURRENCY
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 16 - Queue Number Generation

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that MAX(queue_number) + 1 is unsafe.
It recommends queue_counters with atomic increment.
```

**REQUIREMENT:**
```text
queue_counters table with:
- clinic_id
- service_id
- queue_date
- last_number (or current_number)
- UNIQUE(clinic_id, service_id, queue_date)
- Atomic increment via PostgreSQL sequence or INSERT ON CONFLICT
```

**PROBLEM:**
The blueprint describes the concept but does not provide the actual implementation pattern. The exact atomic mechanism is unspecified.

**IMPACT:**
Race conditions could produce duplicate queue numbers, causing operational confusion and potential patient misidentification.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit implementation:
```sql
-- Option A: Sequence per clinic/service/date
CREATE SEQUENCE queue_seq_{clinic_id}_{service_id}_{date};

-- Option B: Atomic upsert
INSERT INTO queue_counters (clinic_id, service_id, queue_date, last_number)
VALUES ($1, $2, CURRENT_DATE, 1)
ON CONFLICT (clinic_id, service_id, queue_date)
DO UPDATE SET last_number = queue_counters.last_number + 1
RETURNING last_number;
```

**AFFECTED OBJECTS:**
- queue_counters table
- create_queue_entry() function

**REQUIRED TEST:**
Concurrent queue generation for same clinic/service/date → must produce unique numbers

**STATUS:** OPEN

---

### FINDING ID: ARCH-003

**CATEGORY:** AUTHORIZATION
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 5 - Provider Authorization Must Be Assignment-Based

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that is_provider_for_encounter() is insufficient.
It requires full chain validation:
auth.uid() → user_profiles → provider_profiles → provider_assignments → clinic → clinic_service → encounter
```

**REQUIREMENT:**
```text
is_provider_assigned_to_encounter() must verify:
1. authenticated user
2. active provider profile
3. provider type matches encounter type
4. active provider assignment
5. assignment clinic matches encounter clinic
6. assignment service matches encounter service
7. assignment effective dates are valid
```

**PROBLEM:**
The blueprint describes the requirement but does not provide the actual function implementation. The validation logic is conceptual only.

**IMPACT:**
Without proper implementation, providers could access encounters outside their assigned scope, causing PHI exposure.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit function:
```sql
CREATE FUNCTION is_provider_assigned_to_encounter(
  p_user_id UUID,
  p_encounter_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN user_profiles up ON up.auth_user_id = u.id
    JOIN provider_profiles pp ON pp.user_profile_id = up.id
    JOIN provider_assignments pa ON pa.provider_profile_id = pp.id
    JOIN encounters e ON e.id = p_encounter_id
    WHERE u.id = p_user_id
      AND pp.is_active = TRUE
      AND pa.is_active = TRUE
      AND pa.clinic_id = e.clinic_id
      AND pa.service_id = e.service_id
      AND pa.effective_from <= CURRENT_DATE
      AND (pa.effective_until IS NULL OR pa.effective_until >= CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**AFFECTED OBJECTS:**
- is_provider_assigned_to_encounter() function
- All clinical RLS policies

**REQUIRED TEST:**
Provider A assigned to Clinic A → access Clinic B encounter → DENY

**STATUS:** OPEN

---

### FINDING ID: ARCH-004

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 18 - Medical Record Finalization

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that the current trigger is insufficient.
It requires protection of ALL clinical fields after finalization.
```

**REQUIREMENT:**
```text
Trigger must prevent UPDATE of any clinical field when status = 'finalized'
Protected fields include ALL columns, not just a subset
```

**PROBLEM:**
The blueprint describes the requirement but does not provide the actual trigger implementation. The trigger must protect ALL fields, not just the ones listed.

**IMPACT:**
Finalized medical records could be tampered with, causing clinical integrity failure and potential patient harm.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit trigger:
```sql
CREATE FUNCTION prevent_finalized_medical_record_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    RAISE EXCEPTION 'Finalized medical records cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_record_immutable
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finalized_medical_record_update();
```

**AFFECTED OBJECTS:**
- medical_records table
- prevent_finalized_medical_record_update() function

**REQUIRED TEST:**
UPDATE finalized medical_record → must fail with exception

**STATUS:** OPEN

---

### FINDING ID: ARCH-005

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 20 - Dental Record Finalization

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that dental records need the same immutability protection.
It recommends dental_record_amendments table.
```

**REQUIREMENT:**
```text
Same trigger protection as medical_records.
Separate amendment table for dental corrections.
```

**PROBLEM:**
The blueprint describes the requirement but does not provide the actual implementation. The dental_record_amendments table structure is unspecified.

**IMPACT:**
Finalized dental records could be tampered with, causing clinical integrity failure.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit table and trigger:
```sql
CREATE TABLE dental_record_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_record_id UUID NOT NULL REFERENCES dental_records(id),
  amended_by UUID NOT NULL REFERENCES auth.users(id),
  amended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  original_data JSONB NOT NULL,
  corrected_data JSONB NOT NULL,
  changed_fields TEXT[] NOT NULL,
  correlation_id UUID
);

CREATE TRIGGER trg_dental_record_immutable
  BEFORE UPDATE ON dental_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finalized_dental_record_update();
```

**AFFECTED OBJECTS:**
- dental_records table
- dental_record_amendments table
- prevent_finalized_dental_record_update() function

**REQUIRED TEST:**
UPDATE finalized dental_record → must fail with exception

**STATUS:** OPEN

---

### FINDING ID: ARCH-006

**CATEGORY:** CONCURRENCY
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 22 - Pharmacy Inventory Must Be Transactional

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that inventory operations must be atomic.
It describes the conceptual transaction but does not provide the implementation.
```

**REQUIREMENT:**
```sql
BEGIN
  -- Lock prescription item
  SELECT * FROM prescription_items WHERE id = $1 FOR UPDATE;
  
  -- Lock eligible medicine batch
  SELECT * FROM medicine_batches WHERE id = $2 FOR UPDATE;
  
  -- Verify and deduct
  UPDATE medicine_batches SET quantity_on_hand = quantity_on_hand - $3 WHERE id = $2;
  
  -- Create dispensing record
  INSERT INTO dispensing_records (...) VALUES (...);
  
  -- Create inventory transaction
  INSERT INTO inventory_transactions (...) VALUES (...);
  
  -- Update prescription item
  UPDATE prescription_items SET status = 'dispensed' WHERE id = $1;
  
COMMIT;
```

**PROBLEM:**
The blueprint describes the concept but does not provide the actual function implementation. The row locking mechanism is unspecified.

**IMPACT:**
Concurrent dispensing of the final unit could overspend inventory, causing stock discrepancies and potential patient harm.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit function:
```sql
CREATE FUNCTION dispense_prescription(
  p_prescription_item_id UUID,
  p_medicine_batch_id UUID,
  p_quantity DECIMAL,
  p_dispensed_by UUID
) RETURNS UUID AS $$
DECLARE
  v_dispensing_id UUID;
BEGIN
  -- Lock rows
  PERFORM * FROM prescription_items WHERE id = p_prescription_item_id FOR UPDATE;
  PERFORM * FROM medicine_batches WHERE id = p_medicine_batch_id FOR UPDATE;
  
  -- Verify and create dispensing
  -- ... validation logic ...
  
  -- Deduct stock
  UPDATE medicine_batches 
  SET quantity_on_hand = quantity_on_hand - p_quantity
  WHERE id = p_medicine_batch_id;
  
  -- Create dispensing record
  INSERT INTO dispensing_records (...)
  VALUES (...)
  RETURNING id INTO v_dispensing_id;
  
  RETURN v_dispensing_id;
END;
$$ LANGUAGE plpgsql;
```

**AFFECTED OBJECTS:**
- dispense_prescription() function
- medicine_batches table
- dispensing_records table
- inventory_transactions table

**REQUIRED TEST:**
Concurrent dispense of final unit → exactly one must succeed

**STATUS:** OPEN

---

### FINDING ID: ARCH-007

**CATEGORY:** PRIVACY
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 29 - Document Verification / QR

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that anonymous users must NOT have table access.
It requires RPC-only access via verify_public_document().
```

**REQUIREMENT:**
```text
- anon role has NO policies on document_verifications table
- verify_public_document() is SECURITY DEFINER
- Returns only minimal metadata
- Never returns patient_id or clinical data
```

**PROBLEM:**
The blueprint describes the requirement but does not provide the actual function implementation. The verification token validation logic is unspecified.

**IMPACT:**
If implemented incorrectly, anonymous users could access PHI through the verification table.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit function:
```sql
CREATE FUNCTION verify_public_document(
  p_verification_code TEXT
) RETURNS TABLE (
  document_type TEXT,
  document_control_number TEXT,
  issued_at TIMESTAMPTZ,
  status TEXT,
  valid_until TIMESTAMPTZ,
  institution TEXT
) AS $$
BEGIN
  -- Validate token format
  IF LENGTH(p_verification_code) < 32 THEN
    RAISE EXCEPTION 'Invalid verification code';
  END IF;
  
  -- Lookup document
  RETURN QUERY
  SELECT 
    d.document_type,
    d.document_control_number,
    d.issued_at,
    d.status,
    d.valid_until,
    u.name AS institution
  FROM documents d
  JOIN clinics c ON c.id = d.clinic_id
  JOIN universities u ON u.id = c.university_id
  WHERE d.verification_code = p_verification_code
    AND d.status != 'revoked';
  
  -- Log verification attempt
  INSERT INTO document_verification_logs (verification_code, verified_at)
  VALUES (p_verification_code, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**AFFECTED OBJECTS:**
- verify_public_document() function
- document_verifications table (should be renamed to document_verification_logs)
- documents table

**REQUIRED TEST:**
anon SELECT document_verifications → DENY
anon INSERT document_verifications → DENY
anon verify_public_document(valid_code) → ALLOW (minimal data)

**STATUS:** OPEN

---

### FINDING ID: ARCH-008

**CATEGORY:** AUDIT
**SEVERITY:** CRITICAL

**BLUEPRINT REFERENCE:** Section 31 - Audit Log Security

**CURRENT DESIGN:**
```text
The blueprint correctly identifies that:
1. audit_logs is append-only
2. Triggers cannot audit SELECT operations
3. Read auditing requires explicit mechanism
```

**REQUIREMENT:**
```text
- UPDATE/DELETE on audit_logs = DENY for all roles
- SELECT access restricted to security administrators
- Read auditing via controlled function or application instrumentation
```

**PROBLEM:**
The blueprint acknowledges the limitation but does not provide a solution for read auditing. The architecture is incomplete.

**IMPACT:**
Sensitive data reads cannot be audited, creating a gap in the security audit trail.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit read audit mechanism:
```sql
-- Option 1: Application-level audit
-- Log read access in application server before returning data

-- Option 2: View-based audit
CREATE VIEW audit_sensitive_reads AS
SELECT 
  auth.uid() AS reader,
  'medical_records' AS resource_type,
  mr.id AS resource_id,
  NOW() AS read_at
FROM medical_records mr
WHERE /* authorization check */;

-- Option 3: Function-based audit
CREATE FUNCTION log_medical_record_access(
  p_record_id UUID,
  p_access_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (actor, action, resource_type, resource_id, timestamp)
  VALUES (auth.uid(), p_access_type, 'medical_records', p_record_id, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**AFFECTED OBJECTS:**
- audit_logs table
- log_medical_record_access() function (if exists)

**REQUIRED TEST:**
SELECT medical_record → audit log entry created

**STATUS:** OPEN

---

## 3. HIGH FINDINGS

### FINDING ID: ARCH-009

**CATEGORY:** AUTHORIZATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 37 - Security Definer Functions

**CURRENT DESIGN:**
```text
The blueprint defines requirements for SECURITY DEFINER functions:
1. Explicit search_path
2. Qualify object names
3. Validate auth.uid()
4. Fail closed
5. Restrict EXECUTE
```

**REQUIREMENT:**
```text
Complete catalog of all SECURITY DEFINER functions with:
- Function name
- Purpose
- Caller restrictions
- Search path
- RLS interaction
- Risk assessment
```

**PROBLEM:**
The blueprint defines the requirements but does not provide the actual function catalog. Without this catalog, functions cannot be reviewed.

**IMPACT:**
SECURITY DEFINER functions could become RLS bypass channels if not properly reviewed.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide complete function catalog (see Section 8 of this audit).

**AFFECTED OBJECTS:**
- All SECURITY DEFINER functions

**REQUIRED TEST:**
Each function must be tested for RLS bypass

**STATUS:** OPEN

---

### FINDING ID: ARCH-010

**CATEGORY:** RLS
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 48 - RLS Matrix Must Be Machine-Readable

**CURRENT DESIGN:**
```text
The blueprint requires a TABLE × ROLE × ACTION × SCOPE matrix.
It provides examples but not the complete matrix.
```

**REQUIREMENT:**
```text
Complete matrix for all tables × roles × actions with expected results:
- ALLOW
- DENY
- CONTROLLED RPC
```

**PROBLEM:**
The blueprint does not provide the complete matrix. Without this matrix, RLS policies cannot be validated.

**IMPACT:**
Missing or incorrect RLS policies could cause unauthorized data access.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide complete RLS matrix (see Section 6 of this audit).

**AFFECTED OBJECTS:**
- All RLS policies

**REQUIRED TEST:**
Each matrix entry must be tested

**STATUS:** OPEN

---

### FINDING ID: ARCH-011

**CATEGORY:** TESTING
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 59 - Security Testing Requirement

**CURRENT DESIGN:**
```text
The blueprint requires executable tests using pgTAP or DO blocks.
It does not provide the actual test specifications.
```

**REQUIREMENT:**
```text
Executable test specifications for all critical security guarantees:
- Patient isolation
- Provider isolation
- Admin separation
- Immutability
- Concurrency
- QR verification
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual test specifications. Without executable tests, security cannot be validated.

**IMPACT:**
Security guarantees cannot be verified, leaving the system vulnerable to undetected flaws.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide executable test specifications (see Section 12 of this audit).

**AFFECTED OBJECTS:**
- All security-critical functions and policies

**REQUIRED TEST:**
All tests must pass before production deployment

**STATUS:** OPEN

---

### FINDING ID: ARCH-012

**CATEGORY:** MIGRATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 70 - Migration Architecture

**CURRENT DESIGN:**
```text
The blueprint requires a migration dependency graph.
It provides recommended phases but not the actual dependency graph.
```

**REQUIREMENT:**
```text
Complete dependency graph showing:
- Table dependencies
- Function dependencies
- Trigger dependencies
- RLS helper dependencies
- RLS policy dependencies
- View dependencies
- Storage policy dependencies
- Seed dependencies
```

**PROBLEM:**
The blueprint does not provide the actual dependency graph. Without this graph, migrations could fail due to circular dependencies.

**IMPACT:**
Migration failures could delay deployment or cause data integrity issues.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide complete dependency graph (see Section 13 of this audit).

**AFFECTED OBJECTS:**
- All migration files

**REQUIRED TEST:**
All migrations must apply successfully in order

**STATUS:** OPEN

---

### FINDING ID: ARCH-013

**CATEGORY:** AUTHORIZATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 33 - Reporting Security

**CURRENT DESIGN:**
```text
The blueprint defines requirements for reporting security:
- Report scope
- Role authorization
- Clinic/campus scope
- Aggregation level
- Export permission
```

**REQUIREMENT:**
```text
Explicit authorization for each report:
- Who can execute
- What rows can be seen
- Organizational scope
- Whether PHI is included
- Whether export is allowed
- Whether export is audited
```

**PROBLEM:**
The blueprint defines requirements but does not provide the actual report authorization specifications. Without these specifications, reports could expose PHI.

**IMPACT:**
Reports could become RLS bypass channels, exposing sensitive data.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit report authorization for each report type.

**AFFECTED OBJECTS:**
- All reporting views and functions

**REQUIRED TEST:**
Each report must be tested for authorization enforcement

**STATUS:** OPEN

---

### FINDING ID: ARCH-014

**CATEGORY:** TESTING
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 61 - Security Test Fix

**CURRENT DESIGN:**
```text
The blueprint identifies a typo:
- Correct: request.jwt.claim.sub
- Incorrect: request.jwt.clain.sub
```

**REQUIREMENT:**
```text
All tests must use correct PostgreSQL/Supabase request settings.
```

**PROBLEM:**
The blueprint identifies the typo but does not provide the correction. The actual test code is not provided.

**IMPACT:**
Tests using incorrect syntax will fail, providing false negatives.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide corrected test syntax:
```sql
-- Correct
SELECT current_setting('request.jwt.claim.sub', true);

-- Incorrect
SELECT current_setting('request.jwt.clain.sub', true);
```

**AFFECTED OBJECTS:**
- All security tests

**REQUIRED TEST:**
All tests must use correct syntax

**STATUS:** OPEN

---

### FINDING ID: ARCH-015

**CATEGORY:** AUTHORIZATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 64 - Policy Coverage Check

**CURRENT DESIGN:**
```text
The blueprint requires TABLE × ROLE × ACTION × SCOPE coverage.
It does not provide the actual coverage matrix.
```

**REQUIREMENT:**
```text
Complete coverage matrix for:
- 42 tables × 9 roles × 4 actions
- Each entry: ALLOW, DENY, or CONTROLLED RPC
```

**PROBLEM:**
The blueprint does not provide the actual coverage matrix. Without this matrix, policy gaps cannot be identified.

**IMPACT:**
Missing policies could allow unauthorized access.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide complete coverage matrix.

**AFFECTED OBJECTS:**
- All RLS policies

**REQUIRED TEST:**
Each matrix entry must be tested

**STATUS:** OPEN

---

### FINDING ID: ARCH-016

**CATEGORY:** AUTHORIZATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 65 - Function Execute Privileges

**CURRENT DESIGN:**
```text
The blueprint requires documentation of function execute privileges:
- Function name
- Security invoker/definer
- Search path
- Arguments
- Return type
- Allowed caller roles
- EXECUTE privilege
- RLS interaction
- Possible data leakage
```

**REQUIREMENT:**
```text
Complete function catalog with execute privilege documentation.
```

**PROBLEM:**
The blueprint defines requirements but does not provide the actual function catalog. Without this catalog, function security cannot be validated.

**IMPACT:**
Functions could become data leakage channels if execute privileges are not properly restricted.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide complete function catalog (see Section 8 of this audit).

**AFFECTED OBJECTS:**
- All database functions

**REQUIRED TEST:**
Each function must be tested for execute privilege enforcement

**STATUS:** OPEN

---

### FINDING ID: ARCH-017

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 51 - Status Transitions

**CURRENT DESIGN:**
```text
The blueprint requires defined status transitions for:
- Medical records: draft → finalized → amended
- Prescriptions
- Clearances
- Follow-ups
- Queue entries
- Documents
- Incidents
```

**REQUIREMENT:**
```text
CHECK constraints or trigger functions to enforce legal state transitions.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual implementation. The transition logic is unspecified.

**IMPACT:**
Invalid status transitions could cause data integrity issues and clinical workflow problems.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit transition logic:
```sql
CREATE FUNCTION validate_medical_record_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
    RETURN NEW;
  ELSIF OLD.status = 'finalized' AND NEW.status = 'amended' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**AFFECTED OBJECTS:**
- All tables with status fields
- Status transition trigger functions

**REQUIRED TEST:**
Invalid status transition → must fail

**STATUS:** OPEN

---

### FINDING ID: ARCH-018

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 52 - Delete Policy

**CURRENT DESIGN:**
```text
The blueprint requires:
- Clinical data: DELETE = DENY
- Use lifecycle states (archived, cancelled, revoked, inactive)
- Audit records: DELETE = DENY, UPDATE = DENY
```

**REQUIREMENT:**
```text
Soft delete mechanism for clinical data.
Append-only for audit records.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual implementation. The soft delete mechanism is unspecified.

**IMPACT:**
Clinical data could be permanently deleted, causing data loss and compliance issues.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit soft delete mechanism:
```sql
-- Add status columns for soft delete
ALTER TABLE medical_records ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE medical_records ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN archived_by UUID;

-- Prevent physical DELETE
CREATE FUNCTION prevent_medical_record_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Medical records cannot be physically deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_record_no_delete
  BEFORE DELETE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_medical_record_delete();
```

**AFFECTED OBJECTS:**
- All clinical tables
- All audit tables

**REQUIRED TEST:**
DELETE clinical record → must fail
UPDATE audit record → must fail

**STATUS:** OPEN

---

### FINDING ID: ARCH-019

**CATEGORY:** AUTHORIZATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 79 - Security Definer Review Gate

**CURRENT DESIGN:**
```text
The blueprint requires a review table for all SECURITY DEFINER functions:
| Function | Definer? | Why | Search Path | RLS Interaction | Caller | Risk |
```

**REQUIREMENT:**
```text
Complete review table for all SECURITY DEFINER functions before production.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual review table. Without this table, functions cannot be approved.

**IMPACT:**
Unreviewed SECURITY DEFINER functions could become security vulnerabilities.

**REQUIRED ARCHITECTURAL CHANGE:**
Provide complete review table (see Section 8 of this audit).

**AFFECTED OBJECTS:**
- All SECURITY DEFINER functions

**REQUIRED TEST:**
Each function must be reviewed and approved

**STATUS:** OPEN

---

### FINDING ID: ARCH-020

**CATEGORY:** MIGRATION
**SEVERITY:** HIGH

**BLUEPRINT REFERENCE:** Section 81 - Hard Stop Gates

**CURRENT DESIGN:**
```text
The blueprint lists 24 hard stop gates.
This audit has identified 6 gates that FAIL.
```

**REQUIREMENT:**
```text
All 24 gates must PASS before production SQL generation.
```

**PROBLEM:**
6 gates currently FAIL, blocking production migration.

**IMPact:**
Production migration cannot proceed until all gates pass.

**REQUIRED ARCHITECTURAL CHANGE:**
Resolve all 6 failing gates (see Section 1 of this audit).

**AFFECTED OBJECTS:**
- All architecture documents

**REQUIRED TEST:**
All gates must be re-evaluated after changes

**STATUS:** OPEN

---

## 4. MEDIUM FINDINGS

### FINDING ID: ARCH-021

**CATEGORY:** PRIVACY
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 32 - Audit Log Content

**CURRENT DESIGN:**
```text
The blueprint recommends:
- changed_fields
- record identifiers
- actor
- timestamp
- action
- reason
- correlation_id
```

**REQUIREMENT:**
```text
Minimize PHI in audit logs.
Prefer changed_fields over full snapshots.
```

**PROBLEM:**
The blueprint defines the recommendation but does not provide the actual audit log schema. The exact fields to capture are unspecified.

**IMPACT:**
Audit logs could contain unnecessary PHI, increasing exposure risk.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit audit log schema:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  changed_fields TEXT[],
  reason TEXT,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**AFFECTED OBJECTS:**
- audit_logs table

**REQUIRED TEST:**
Audit log must not contain full PHI snapshots

**STATUS:** OPEN

---

### FINDING ID: ARCH-022

**CATEGORY:** AUTHORIZATION
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 33 - Reporting Security

**CURRENT DESIGN:**
```text
The blueprint requires:
- Report scope
- Role authorization
- Clinic/campus scope
- Aggregation level
- Export permission
```

**REQUIREMENT:**
```text
Export must be auditable.
Population reports should use aggregate/de-identified data.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual export audit mechanism. The audit fields are unspecified.

**IMPACT:**
Sensitive data exports could go unaudited, creating compliance gaps.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit export audit:
```sql
CREATE TABLE report_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID NOT NULL REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  filters JSONB,
  record_count INTEGER,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id UUID
);
```

**AFFECTED OBJECTS:**
- report_export_logs table

**REQUIRED TEST:**
Export must create audit log entry

**STATUS:** OPEN

---

### FINDING ID: ARCH-023

**CATEGORY:** PRIVACY
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 55 - Login History

**CURRENT DESIGN:**
```text
The blueprint defines login history as security-sensitive.
Access should be restricted to:
- own
- security administrator
- system security
```

**REQUIREMENT:**
```text
RLS policies to restrict login history access.
IP addresses and user agents are sensitive.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual RLS policies. The access control logic is unspecified.

**IMPACT:**
Login history could be exposed to unauthorized users, creating security risks.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit RLS policies:
```sql
-- Patient: own only
CREATE POLICY login_history_own_only ON login_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin: all (if authorized)
CREATE POLICY login_history_admin ON login_history
  FOR SELECT
  USING (has_role('admin'));
```

**AFFECTED OBJECTS:**
- login_history table
- login_history RLS policies

**REQUIRED TEST:**
Patient A → Patient B login history → DENY

**STATUS:** OPEN

---

### FINDING ID: ARCH-024

**CATEGORY:** PRIVACY
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 56 - Report Export

**CURRENT DESIGN:**
```text
The blueprint requires:
- actor
- report type
- scope
- timestamp
- filters
- record count
- correlation ID
```

**REQUIREMENT:**
```text
Every export of sensitive data must be auditable.
Do not store unnecessary PHI in export audit metadata.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual audit implementation. The exact fields are unspecified.

**IMPACT:**
Export audits could be incomplete, creating compliance gaps.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit export audit (see FINDING ARCH-022).

**AFFECTED OBJECTS:**
- report_export_logs table

**REQUIRED TEST:**
Export must create audit log entry with required fields

**STATUS:** OPEN

---

### FINDING ID: ARCH-025

**CATEGORY:** SECURITY
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 57 - Realtime Security

**CURRENT DESIGN:**
```text
The blueprint requires:
- Verify RLS behavior
- Verify channel authorization
- Verify clinic scoping
- Verify patient isolation
- Never expose unrestricted channels
- Never use service-role credentials in browser
```

**REQUIREMENT:**
```text
Realtime channels must enforce RLS.
Queue updates must not expose patient information.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual Realtime security implementation. The channel authorization logic is unspecified.

**IMPACT:**
Realtime channels could become side channels for unauthorized data access.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit Realtime security:
```sql
-- Realtime policies inherit RLS policies
-- Ensure all tables with Realtime have proper RLS
-- Queue updates should only include queue_number and status, not patient info
```

**AFFECTED OBJECTS:**
- All tables with Realtime enabled
- Realtime channel policies

**REQUIRED TEST:**
Unauthorized user → Realtime channel → DENY

**STATUS:** OPEN

---

### FINDING ID: ARCH-026

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 68 - Document / Clearance Relationship

**CURRENT DESIGN:**
```text
The blueprint asks whether clearances, certificate_requests, documents represent:
1. business records
2. generated document metadata
3. document files
```

**REQUIREMENT:**
```text
Clarify the relationship between these entities.
Define authoritative ownership for:
- control number
- verification code
- status
- revocation
- file path
```

**PROBLEM:**
The blueprint raises the question but does not provide the answer. The relationship is undefined.

**IMPact:**
Unclear relationships could cause data duplication and inconsistency.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit relationship:
```text
documents = metadata + file reference
clearances = business records that generate documents
certificate_requests = requests that generate documents
```

**AFFECTED OBJECTS:**
- documents table
- clearances table
- certificate_requests table

**REQUIRED TEST:**
Document control number must be unique

**STATUS:** OPEN

---

### FINDING ID: ARCH-027

**CATEGORY:** AUTHORIZATION
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 75 - Super Admin Break-Glass

**CURRENT DESIGN:**
```text
The blueprint recommends:
- break_glass_clinical_access
- explicit authorization
- reason
- time limitation
- audit
- possibly dual authorization
```

**REQUIREMENT:**
```text
Emergency access mechanism must be separate from SUPER_ADMIN role.
```

**PROBLEM:**
The blueprint defines the concept but does not provide the actual implementation. The break-glass mechanism is unspecified.

**IMPact:**
Without break-glass, emergency access may not be possible.
With improper implementation, emergency access could be abused.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit break-glass mechanism:
```sql
CREATE TABLE break_glass_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  audit_trail JSONB NOT NULL
);
```

**AFFECTED OBJECTS:**
- break_glass_access table
- break_glass_authorize() function

**REQUIRED TEST:**
Break-glass access must expire and be audited

**STATUS:** OPEN

---

### FINDING ID: ARCH-028

**CATEGORY:** AUTHORIZATION
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 78 - Server Role Claims

**CURRENT DESIGN:**
```text
The blueprint warns against treating client-provided JWT role claims as authoritative.
It recommends deriving authorization from database-backed role assignments.
```

**REQUIREMENT:**
```text
Authorization must be derived from database, not JWT claims.
JWT claims should be validated against database.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual implementation. The role validation logic is unspecified.

**IMPact:**
Client-provided role claims could be manipulated, causing privilege escalation.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit role validation:
```sql
CREATE FUNCTION validate_user_role(
  p_user_id UUID,
  p_required_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND r.name = p_required_role
      AND ur.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**AFFECTED OBJECTS:**
- validate_user_role() function
- All role-based RLS policies

**REQUIRED TEST:**
Client provides admin role → database validates against actual role → DENY if not actual admin

**STATUS:** OPEN

---

### FINDING ID: ARCH-029

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** MEDIUM

**BLUEPRINT REFERENCE:** Section 12 - Patient Identity Invariants

**CURRENT DESIGN:**
```text
The blueprint requires:
- patient_type and user_type consistency
- campus consistency
- university identifier consistency
```

**REQUIREMENT:**
```text
Database must either enforce consistency or define which table is authoritative.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual implementation. The consistency rules are unspecified.

**IMPact:**
Inconsistent identity data could cause authorization failures and patient misidentification.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit consistency rules:
```sql
CREATE FUNCTION validate_patient_user_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_profile_id IS NOT NULL THEN
    IF NEW.patient_type != (
      SELECT user_type FROM user_profiles WHERE id = NEW.user_profile_id
    ) THEN
      RAISE EXCEPTION 'patient_type must match user_type';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**AFFECTED OBJECTS:**
- patient_profiles table
- validate_patient_user_consistency() function

**REQUIRED TEST:**
Inconsistent patient_type/user_type → must fail

**STATUS:** OPEN

---

## 5. LOW FINDINGS

### FINDING ID: ARCH-030

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** LOW

**BLUEPRINT REFERENCE:** Section 13 - Walk-in Patient Support

**CURRENT DESIGN:**
```text
The blueprint allows patient_profiles.user_profile_id to be NULL for walk-in patients.
Walk-in patients must not automatically receive authenticated self-service access.
```

**REQUIREMENT:**
```text
Walk-in patients must have unique identification through other means.
```

**PROBLEM:**
The blueprint defines the requirement but does not specify the uniqueness constraint for walk-in patients. The exact constraint is unspecified.

**IMPact:**
Walk-in patients could have duplicate records, causing identification issues.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit constraint:
```sql
-- Unique constraint for walk-in patients
CREATE UNIQUE INDEX idx_patient_profiles_walkin_unique 
  ON patient_profiles (university_id) 
  WHERE user_profile_id IS NULL;
```

**AFFECTED OBJECTS:**
- patient_profiles table

**REQUIRED TEST:**
Walk-in patient with duplicate university_id → must fail

**STATUS:** OPEN

---

### FINDING ID: ARCH-031

**CATEGORY:** AUTHORIZATION
**SEVERITY:** LOW

**BLUEPRINT REFERENCE:** Section 66 - RPC Security

**CURRENT DESIGN:**
```text
The blueprint lists candidate RPCs:
- create_queue_entry()
- create_encounter()
- finalize_medical_record()
- finalize_dental_record()
- amend_medical_record()
- amend_dental_record()
- record_consent()
- withdraw_consent()
- dispense_prescription()
- generate_document_control_number()
- verify_public_document()
```

**REQUIREMENT:**
```text
The exact RPC set must be finalized before migrations.
```

**PROBLEM:**
The blueprint lists candidates but does not finalize the set. The exact RPCs are unspecified.

**IMPact:**
Incomplete RPC set could leave security gaps.

**REQUIRED ARCHITECTURAL CHANGE:**
Finalize RPC set and provide specifications for each.

**AFFECTED OBJECTS:**
- All RPC functions

**REQUIRED TEST:**
Each RPC must be tested for authorization enforcement

**STATUS:** OPEN

---

### FINDING ID: ARCH-032

**CATEGORY:** DATA INTEGRITY
**SEVERITY:** LOW

**BLUEPRINT REFERENCE:** Section 21 - Odontogram is Historical

**CURRENT DESIGN:**
```text
The blueprint requires:
- Event-based odontogram records
- Never overwrite historical conditions
- Current state derived from latest record
```

**REQUIREMENT:**
```text
Odontogram records must be immutable after creation.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual implementation. The immutability mechanism is unspecified.

**IMPact:**
Odontogram history could be modified, causing clinical integrity issues.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit immutability:
```sql
CREATE FUNCTION prevent_odontogram_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Odontogram records are immutable';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_odontogram_immutable
  BEFORE UPDATE ON odontogram_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_odontogram_update();
```

**AFFECTED OBJECTS:**
- odontogram_records table
- prevent_odontogram_update() function

**REQUIRED TEST:**
UPDATE odontogram_record → must fail

**STATUS:** OPEN

---

### FINDING ID: ARCH-033

**CATEGORY:** PRIVACY
**SEVERITY:** LOW

**BLUEPRINT REFERENCE:** Section 54 - Public Verification Token

**CURRENT DESIGN:**
```text
The blueprint requires:
- Unpredictable
- Not expose patient identity
- Not encode PHI
- Not sequential
- Revocable
```

**REQUIREMENT:**
```text
Token generation must use cryptographic random.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual token generation mechanism. The exact algorithm is unspecified.

**IMPact:**
Weak tokens could be guessed or enumerated, causing privacy violations.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit token generation:
```sql
CREATE FUNCTION generate_verification_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
```

**AFFECTED OBJECTS:**
- generate_verification_token() function
- documents table

**REQUIRED TEST:**
Generated token must be 64 characters hex string

**STATUS:** OPEN

---

### FINDING ID: ARCH-034

**CATEGORY:** TESTING
**SEVERITY:** LOW

**BLUEPRINT REFERENCE:** Section 62 - Test Data Model

**CURRENT DESIGN:**
```text
The blueprint requires deterministic fictional users:
- student_a, student_b
- doctor_a, doctor_b
- dentist_a
- nurse_a
- clinic_staff_a
- admin_a
- super_admin_a
- admin_doctor_a
```

**REQUIREMENT:**
```text
Tests must use deterministic test data.
```

**PROBLEM:**
The blueprint defines the requirement but does not provide the actual test data. The exact data is unspecified.

**IMPact:**
Non-deterministic tests could produce inconsistent results.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit test data:
```sql
-- Test users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student_a@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'doctor_a@test.com'),
  -- ... more test users
;
```

**AFFECTED OBJECTS:**
- Test seed data

**REQUIRED TEST:**
Tests must produce consistent results with test data

**STATUS:** OPEN

---

### FINDING ID: ARCH-035

**CATEGORY:** AUTHORIZATION
**SEVERITY:** LOW

**BLUEPRINT REFERENCE:** Section 73 - RLS Policy Style

**CURRENT DESIGN:**
```text
The blueprint recommends:
- Explicit SELECT USING
- Explicit INSERT WITH CHECK
- Explicit UPDATE USING + WITH CHECK
- No broad policies like admin_all
```

**REQUIREMENT:**
```text
RLS policies must be explicit and granular.
```

**PROBLEM:**
The blueprint defines the style but does not provide the actual policies. The exact policies are unspecified.

**IMPact:**
Broad policies could cause unauthorized access.

**REQUIRED ARCHITECTURAL CHANGE:**
Define explicit RLS policies for each table (see Section 6 of this audit).

**AFFECTED OBJECTS:**
- All RLS policies

**REQUIRED TEST:**
Each policy must be tested for correct enforcement

**STATUS:** OPEN

---

## 6. TABLE-BY-TABLE AUDIT

### Table: user_profiles

| Property | Value |
|----------|-------|
| PURPOSE | Application user identity |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | auth_user_id → auth.users(id) |
| UNIQUE | auth_user_id |
| CHECKS | status IN ('active', 'inactive', 'suspended') |
| SOURCE OF TRUTH | auth.users for authentication, user_profiles for application identity |
| RLS | User can read/update own profile |
| DELETE POLICY | DENY (soft delete via status) |
| IMMUTABILITY | Non-sensitive fields mutable, security fields immutable |
| ORGANIZATIONAL SCOPE | campus_id |
| SECURITY ISSUE | None - correctly designed |
| STATUS | PASS |

### Table: patient_profiles

| Property | Value |
|----------|-------|
| PURPOSE | Clinical patient identity |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | user_profile_id → user_profiles(id) [nullable for walk-ins] |
| UNIQUE | user_profile_id (REQUIRED - FINDING ARCH-001) |
| CHECKS | patient_type IN ('student', 'faculty', 'staff', 'walkin') |
| SOURCE OF TRUTH | user_profiles for linked patients, patient_profiles for clinical identity |
| RLS | Patient reads own, provider reads assigned, admin DENY |
| DELETE POLICY | DENY |
| IMMUTABILITY | Demographics mutable with audit |
| ORGANIZATIONAL SCOPE | campus_id, clinic_id |
| SECURITY ISSUE | Missing UNIQUE constraint on user_profile_id |
| STATUS | OPEN (FINDING ARCH-001) |

### Table: provider_profiles

| Property | Value |
|----------|-------|
| PURPOSE | Clinical provider identity |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | user_profile_id → user_profiles(id) |
| UNIQUE | user_profile_id |
| CHECKS | provider_type IN ('doctor', 'dentist', 'nurse') |
| SOURCE OF TRUTH | user_profiles for user identity, provider_profiles for clinical role |
| RLS | Provider reads own, admin reads within scope |
| DELETE POLICY | DENY |
| IMMUTABILITY | Professional details mutable with audit |
| ORGANIZATIONAL SCOPE | campus_id |
| SECURITY ISSUE | None - correctly designed |
| STATUS | PASS |

### Table: provider_assignments

| Property | Value |
|----------|-------|
| PURPOSE | Provider clinic/service assignments |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | provider_profile_id → provider_profiles(id), clinic_id → clinics(id), service_id → clinic_services(id) |
| UNIQUE | (provider_profile_id, clinic_id, service_id, effective_from) |
| CHECKS | effective_until > effective_from, is_active boolean |
| SOURCE OF TRUTH | Assignment records |
| RLS | Provider reads own, admin reads within scope |
| DELETE POLICY | DENY (soft delete via is_active) |
| IMMUTABILITY | Assignments are append-only |
| ORGANIZATIONAL SCOPE | clinic_id, campus_id |
| SECURITY ISSUE | None - correctly designed |
| STATUS | PASS |

### Table: clinics

| Property | Value |
|----------|-------|
| PURPOSE | Clinic definitions |
| SENSITIVITY | PUBLIC |
| PK | id (UUID) |
| FK | campus_id → campuses(id) |
| UNIQUE | (campus_id, name) |
| CHECKS | is_active boolean |
| SOURCE OF TRUTH | Organizational configuration |
| RLS | Public read, admin manage |
| DELETE POLICY | DENY (soft delete via is_active) |
| IMMUTABILITY | Configuration mutable |
| ORGANIZATIONAL SCOPE | campus_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: clinic_services

| Property | Value |
|----------|-------|
| PURPOSE | Services offered by clinics |
| SENSITIVITY | PUBLIC |
| PK | id (UUID) |
| FK | clinic_id → clinics(id) |
| UNIQUE | (clinic_id, name) |
| CHECKS | category IN ('medical', 'dental', 'fbs') |
| SOURCE OF TRUTH | Clinical configuration |
| RLS | Public read, admin manage |
| DELETE POLICY | DENY (soft delete via is_active) |
| IMMUTABILITY | Configuration mutable |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: queue_entries

| Property | Value |
|----------|-------|
| PURPOSE | Patient queue management |
| SENSITIVITY | CONFIDENTIAL |
| PK | id (UUID) |
| FK | patient_id → patient_profiles(id), clinic_id → clinics(id), service_id → clinic_services(id), encounter_id → encounters(id) [nullable] |
| UNIQUE | (clinic_id, service_id, queue_date, queue_number) |
| CHECKS | status IN ('waiting', 'in_progress', 'completed', 'cancelled') |
| SOURCE OF TRUTH | Queue management system |
| RLS | Patient reads own, staff manages within clinic |
| DELETE POLICY | DENY (soft delete via status) |
| IMMUTABILITY | Queue number immutable |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | Circular FK with encounters - see FINDING ARCH-036 |
| STATUS | OPEN |

### Table: encounters

| Property | Value |
|----------|-------|
| PURPOSE | Central clinical event |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | patient_id → patient_profiles(id), clinic_id → clinics(id), service_id → clinic_services(id), provider_id → provider_profiles(id), queue_entry_id → queue_entries(id) [nullable] |
| UNIQUE | (queue_entry_id) [one-to-one] |
| CHECKS | encounter_type matches service category |
| SOURCE OF TRUTH | Clinical workflow |
| RLS | Patient reads own, provider reads assigned |
| DELETE POLICY | DENY |
| IMMUTABILITY | Encounter data immutable after finalization |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | Circular FK with queue_entries - see FINDING ARCH-036 |
| STATUS | OPEN |

### Table: medical_records

| Property | Value |
|----------|-------|
| PURPOSE | Medical clinical documentation |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | encounter_id → encounters(id), patient_id → patient_profiles(id), created_by → provider_profiles(id) |
| UNIQUE | encounter_id (one-to-one) |
| CHECKS | status IN ('draft', 'finalized', 'amended') |
| SOURCE OF TRUTH | Clinical documentation |
| RLS | Doctor reads assigned, patient reads own, admin DENY |
| DELETE POLICY | DENY |
| IMMUTABILITY | Finalized records immutable (FINDING ARCH-004) |
| ORGANIZATIONAL SCOPE | clinic_id via encounter |
| SECURITY ISSUE | Immutability trigger incomplete |
| STATUS | OPEN (FINDING ARCH-004) |

### Table: dental_records

| Property | Value |
|----------|-------|
| PURPOSE | Dental clinical documentation |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | encounter_id → encounters(id), patient_id → patient_profiles(id), created_by → provider_profiles(id) |
| UNIQUE | encounter_id (one-to-one) |
| CHECKS | status IN ('draft', 'finalized', 'amended') |
| SOURCE OF TRUTH | Clinical documentation |
| RLS | Dentist reads assigned, patient reads own, admin DENY |
| DELETE POLICY | DENY |
| IMMUTABILITY | Finalized records immutable (FINDING ARCH-005) |
| ORGANIZATIONAL SCOPE | clinic_id via encounter |
| SECURITY ISSUE | Immutability trigger incomplete |
| STATUS | OPEN (FINDING ARCH-005) |

### Table: prescriptions

| Property | Value |
|----------|-------|
| PURPOSE | Medication prescriptions |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | encounter_id → encounters(id), patient_id → patient_profiles(id), prescribed_by → provider_profiles(id) |
| UNIQUE | id |
| CHECKS | status IN ('active', 'dispensed', 'cancelled', 'expired') |
| SOURCE OF TRUTH | Clinical workflow |
| RLS | Doctor reads assigned, patient reads own, admin DENY |
| DELETE POLICY | DENY (soft delete via status) |
| IMMUTABILITY | Active prescriptions mutable |
| ORGANIZATIONAL SCOPE | clinic_id via encounter |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: prescription_items

| Property | Value |
|----------|-------|
| PURPOSE | Individual medication items |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | prescription_id → prescriptions(id), medicine_id → medicines(id) |
| UNIQUE | id |
| CHECKS | quantity > 0 |
| SOURCE OF TRUTH | Prescription details |
| RLS | Inherits from prescriptions |
| DELETE POLICY | DENY |
| IMMUTABILITY | Mutable until dispensed |
| ORGANIZATIONAL SCOPE | Inherits from prescriptions |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: medicines

| Property | Value |
|----------|-------|
| PURPOSE | Medicine catalog |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | id |
| UNIQUE | (name, manufacturer) |
| CHECKS | is_active boolean |
| SOURCE OF TRUTH | Pharmacy configuration |
| RLS | Public read, admin manage |
| DELETE POLICY | DENY (soft delete via is_active) |
| IMMUTABILITY | Configuration mutable |
| ORGANIZATIONAL SCOPE | None (system-wide) |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: medicine_batches

| Property | Value |
|----------|-------|
| PURPOSE | Medicine inventory batches |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | medicine_id → medicines(id) |
| UNIQUE | (medicine_id, batch_number) |
| CHECKS | quantity_on_hand >= 0, expiration_date > CURRENT_DATE |
| SOURCE OF TRUTH | Inventory management |
| RLS | Staff reads within clinic, admin manages |
| DELETE POLICY | DENY |
| IMMUTABILITY | Quantity updated transactionally |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | Quantity must be updated transactionally (FINDING ARCH-006) |
| STATUS | OPEN (FINDING ARCH-006) |

### Table: dispensing_records

| Property | Value |
|----------|-------|
| PURPOSE | Medication dispensing audit |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | prescription_item_id → prescription_items(id), medicine_batch_id → medicine_batches(id), dispensed_by → provider_profiles(id) |
| UNIQUE | id |
| CHECKS | quantity > 0 |
| SOURCE OF TRUTH | Dispensing transaction |
| RLS | Staff reads within clinic, patient reads own prescriptions |
| DELETE POLICY | DENY |
| IMMUTABILITY | Append-only |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: inventory_transactions

| Property | Value |
|----------|-------|
| PURPOSE | Inventory movement audit |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | medicine_batch_id → medicine_batches(id) |
| UNIQUE | id |
| CHECKS | quantity_before + quantity_change = quantity_after |
| SOURCE OF TRUTH | Inventory operations |
| RLS | Staff reads within clinic, admin reads all |
| DELETE POLICY | DENY |
| IMMUTABILITY | Append-only |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: documents

| Property | Value |
|----------|-------|
| PURPOSE | Document metadata |
| SENSITIVITY | CONFIDENTIAL |
| PK | id (UUID) |
| FK | patient_id → patient_profiles(id), clinic_id → clinics(id), issued_by → provider_profiles(id) |
| UNIQUE | (document_control_number) |
| CHECKS | status IN ('active', 'revoked', 'expired') |
| SOURCE OF TRUTH | Document management |
| RLS | Patient reads own, staff manages within clinic |
| DELETE POLICY | DENY (soft delete via status) |
| IMMUTABILITY | Control number immutable |
| ORGANIZATIONAL SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: document_verification_logs

| Property | Value |
|----------|-------|
| PURPOSE | QR verification audit |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | verification_code (no FK to prevent PHI exposure) |
| UNIQUE | id |
| CHECKS | None |
| SOURCE OF TRUTH | Verification attempts |
| RLS | anon DENY all, authenticated DENY all |
| DELETE POLICY | DENY |
| IMMUTABILITY | Append-only |
| ORGANIZATIONAL SCOPE | None |
| SECURITY ISSUE | anon must not have table access (FINDING ARCH-007) |
| STATUS | OPEN (FINDING ARCH-007) |

### Table: audit_logs

| Property | Value |
|----------|-------|
| PURPOSE | System audit trail |
| SENSITIVITY | CONFIDENTIAL |
| PK | id (UUID) |
| FK | actor → auth.users(id) |
| UNIQUE | id |
| CHECKS | None |
| SOURCE OF TRUTH | System operations |
| RLS | Admin reads within scope, security admin reads all |
| DELETE POLICY | DENY |
| IMMUTABILITY | Append-only |
| ORGANIZATIONAL SCOPE | None (system-wide) |
| SECURITY ISSUE | Read auditing mechanism unspecified (FINDING ARCH-008) |
| STATUS | OPEN (FINDING ARCH-008) |

### Table: roles

| Property | Value |
|----------|-------|
| PURPOSE | Role definitions |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | id |
| UNIQUE | name |
| CHECKS | None |
| SOURCE OF TRUTH | System configuration |
| RLS | Public read, super admin manage |
| DELETE POLICY | DENY |
| IMMUTABILITY | Roles are configuration |
| ORGANIZATIONAL_SCOPE | None (system-wide) |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: permissions

| Property | Value |
|----------|-------|
| PURPOSE | Permission definitions |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | id |
| UNIQUE | name |
| CHECKS | None |
| SOURCE OF TRUTH | System configuration |
| RLS | Public read, super admin manage |
| DELETE POLICY | DENY |
| IMMUTABILITY | Permissions are configuration |
| ORGANIZATIONAL_SCOPE | None (system-wide) |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: role_permissions

| Property | Value |
|----------|-------|
| PURPOSE | Role-permission mappings |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | role_id → roles(id), permission_id → permissions(id) |
| UNIQUE | (role_id, permission_id) |
| CHECKS | None |
| SOURCE OF TRUTH | System configuration |
| RLS | Public read, super admin manage |
| DELETE POLICY | DENY |
| IMMUTABILITY | Configuration |
| ORGANIZATIONAL_SCOPE | None (system-wide) |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: user_roles

| Property | Value |
|----------|-------|
| PURPOSE | User role assignments |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | user_id → auth.users(id), role_id → roles(id) |
| UNIQUE | (user_id, role_id) |
| CHECKS | is_active boolean |
| SOURCE OF TRUTH | User management |
| RLS | Admin manages within scope, user reads own |
| DELETE POLICY | DENY (soft delete via is_active) |
| IMMUTABILITY | Assignments mutable |
| ORGANIZATIONAL_SCOPE | campus_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: fbs_records

| Property | Value |
|----------|-------|
| PURPOSE | Fasting Blood Sugar records |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | encounter_id → encounters(id), patient_id → patient_profiles(id), recorded_by → provider_profiles(id) |
| UNIQUE | id |
| CHECKS | fbs_value > 0 |
| SOURCE OF TRUTH | Clinical measurements |
| RLS | Nurse/doctor reads assigned, patient reads own, admin DENY |
| DELETE POLICY | DENY |
| IMMUTABILITY | Measurements immutable |
| ORGANIZATIONAL_SCOPE | clinic_id via encounter |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: clearances

| Property | Value |
|----------|-------|
| PURPOSE | Medical/dental clearances |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | patient_id → patient_profiles(id), encounter_id → encounters(id), issued_by → provider_profiles(id) |
| UNIQUE | id |
| CHECKS | status IN ('active', 'revoked', 'expired') |
| SOURCE OF TRUTH | Clinical workflow |
| RLS | Provider reads issued, patient reads own, admin DENY |
| DELETE POLICY | DENY (soft delete via status) |
| IMMUTABILITY | Clearance status mutable |
| ORGANIZATIONAL_SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: clinical_referrals

| Property | Value |
|----------|-------|
| PURPOSE | Patient referrals between providers |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | patient_id → patient_profiles(id), referral_from → provider_profiles(id), referral_to → provider_profiles(id) |
| UNIQUE | id |
| CHECKS | status IN ('pending', 'accepted', 'completed', 'cancelled') |
| SOURCE OF TRUTH | Clinical workflow |
| RLS | Provider reads involved, patient reads own, admin DENY |
| DELETE POLICY | DENY |
| IMMUTABILITY | Referral status mutable |
| ORGANIZATIONAL_SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: consent_records

| Property | Value |
|----------|-------|
| PURPOSE | Patient consent tracking |
| SENSITIVITY | HIGHLY CONFIDENTIAL |
| PK | id (UUID) |
| FK | patient_id → patient_profiles(id), recorded_by → auth.users(id) |
| UNIQUE | id |
| CHECKS | consent_type, consented_at NOT NULL |
| SOURCE OF TRUTH | Consent management |
| RLS | Patient reads own, staff manages within clinic |
| DELETE POLICY | DENY |
| IMMUTABILITY | Consent history append-only |
| ORGANIZATIONAL_SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: incidents

| Property | Value |
|----------|-------|
| PURPOSE | Incident reporting |
| SENSITIVITY | CONFIDENTIAL |
| PK | id (UUID) |
| FK | reported_by → auth.users(id) |
| UNIQUE | id |
| CHECKS | status IN ('open', 'investigating', 'resolved', 'closed') |
| SOURCE OF TRUTH | Incident management |
| RLS | Reporter reads own, admin manages, security reads all |
| DELETE POLICY | DENY |
| IMMUTABILITY | Incident data mutable |
| ORGANIZATIONAL_SCOPE | clinic_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: login_history

| Property | Value |
|----------|-------|
| PURPOSE | Authentication audit |
| SENSITIVITY | CONFIDENTIAL |
| PK | id (UUID) |
| FK | user_id → auth.users(id) |
| UNIQUE | id |
| CHECKS | None |
| SOURCE OF TRUTH | Authentication system |
| RLS | User reads own, admin/security reads all |
| DELETE POLICY | DENY |
| IMMUTABILITY | Append-only |
| ORGANIZATIONAL_SCOPE | None (system-wide) |
| SECURITY ISSUE | RLS policies unspecified (FINDING ARCH-023) |
| STATUS | OPEN (FINDING ARCH-023) |

### Table: notifications

| Property | Value |
|----------|-------|
| PURPOSE | System notifications |
| SENSITIVITY | CONFIDENTIAL |
| PK | id (UUID) |
| FK | user_id → auth.users(id) |
| UNIQUE | id |
| CHECKS | is_read boolean |
| SOURCE OF TRUTH | Notification system |
| RLS | User reads own |
| DELETE POLICY | User can delete own |
| IMMUTABILITY | Notifications mutable |
| ORGANIZATIONAL_SCOPE | None |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: announcements

| Property | Value |
|----------|-------|
| PURPOSE | System announcements |
| SENSITIVITY | PUBLIC |
| PK | id (UUID) |
| FK | created_by → auth.users(id) |
| UNIQUE | id |
| CHECKS | is_active boolean |
| SOURCE OF TRUTH | Content management |
| RLS | Public read, admin manage |
| DELETE POLICY | Admin can delete |
| IMMUTABILITY | Content mutable |
| ORGANIZATIONAL_SCOPE | campus_id (optional) |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: universities

| Property | Value |
|----------|-------|
| PURPOSE | University definitions |
| SENSITIVITY | PUBLIC |
| PK | id (UUID) |
| FK | id |
| UNIQUE | name |
| CHECKS | None |
| SOURCE OF TRUTH | Organizational configuration |
| RLS | Public read, super admin manage |
| DELETE POLICY | DENY |
| IMMUTABILITY | Configuration |
| ORGANIZATIONAL_SCOPE | None (root) |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: campuses

| Property | Value |
|----------|-------|
| PURPOSE | Campus definitions |
| SENSITIVITY | PUBLIC |
| PK | id (UUID) |
| FK | university_id → universities(id) |
| UNIQUE | (university_id, name) |
| CHECKS | None |
| SOURCE OF TRUTH | Organizational configuration |
| RLS | Public read, admin manage |
| DELETE POLICY | DENY |
| IMMUTABILITY | Configuration |
| ORGANIZATIONAL_SCOPE | university_id |
| SECURITY ISSUE | None |
| STATUS | PASS |

### Table: queue_counters

| Property | Value |
|----------|-------|
| PURPOSE | Atomic queue number generation |
| SENSITIVITY | INTERNAL |
| PK | id (UUID) |
| FK | clinic_id → clinics(id), service_id → clinic_services(id) |
| UNIQUE | (clinic_id, service_id, queue_date) |
| CHECKS | last_number >= 0 |
| SOURCE OF TRUTH | Queue system |
| RLS | System only (SECURITY DEFINER function) |
| DELETE POLICY | DENY |
| IMMUTABILITY | Updated atomically |
| ORGANIZATIONAL_SCOPE | clinic_id |
| SECURITY ISSUE | None (if implemented correctly) |
| STATUS | PASS |

---

## 7. RELATIONSHIP & CONSTRAINT AUDIT

### patient ↔ user

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-zero-or-one |
| FK | patient_profiles.user_profile_id → user_profiles.id |
| UNIQUE | user_profile_id (REQUIRED) |
| NULLABLE | Yes (for walk-in patients) |
| ENFORCEMENT | UNIQUE constraint |
| STATUS | OPEN (FINDING ARCH-001) |

### provider ↔ user

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-one |
| FK | provider_profiles.user_profile_id → user_profiles.id |
| UNIQUE | user_profile_id |
| NULLABLE | No |
| ENFORCEMENT | UNIQUE constraint |
| STATUS | PASS |

### provider ↔ assignment

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-many |
| FK | provider_assignments.provider_profile_id → provider_profiles.id |
| UNIQUE | (provider_profile_id, clinic_id, service_id, effective_from) |
| NULLABLE | No |
| ENFORCEMENT | FK + UNIQUE |
| STATUS | PASS |

### assignment ↔ clinic

| Property | Value |
|----------|-------|
| RELATIONSHIP | Many-to-one |
| FK | provider_assignments.clinic_id → clinics.id |
| UNIQUE | No |
| NULLABLE | No |
| ENFORCEMENT | FK |
| STATUS | PASS |

### assignment ↔ service

| Property | Value |
|----------|-------|
| RELATIONSHIP | Many-to-one |
| FK | provider_assignments.service_id → clinic_services.id |
| UNIQUE | No |
| NULLABLE | No (REQUIRED per FINDING) |
| ENFORCEMENT | FK |
| STATUS | PASS |

### queue ↔ encounter

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-one (nullable) |
| FK | queue_entries.encounter_id → encounters.id, encounters.queue_entry_id → queue_entries.id |
| UNIQUE | encounter_id, queue_entry_id |
| NULLABLE | encounter_id nullable until encounter created |
| ENFORCEMENT | Circular FK - requires phased migration (FINDING ARCH-036) |
| STATUS | OPEN (FINDING ARCH-036) |

### encounter ↔ clinical record

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-one |
| FK | medical_records.encounter_id → encounters.id, dental_records.encounter_id → encounters.id |
| UNIQUE | encounter_id |
| NULLABLE | No |
| ENFORCEMENT | FK + UNIQUE |
| STATUS | PASS |

### prescription ↔ dispensing

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-many |
| FK | dispensing_records.prescription_item_id → prescription_items.id |
| UNIQUE | No |
| NULLABLE | No |
| ENFORCEMENT | FK |
| STATUS | PASS |

### medicine ↔ batch

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-many |
| FK | medicine_batches.medicine_id → medicines.id |
| UNIQUE | (medicine_id, batch_number) |
| NULLABLE | No |
| ENFORCEMENT | FK + UNIQUE |
| STATUS | PASS |

### document ↔ verification

| Property | Value |
|----------|-------|
| RELATIONSHIP | One-to-many (logs) |
| FK | document_verification_logs (no FK to documents for security) |
| UNIQUE | No |
| NULLABLE | N/A |
| ENFORCEMENT | Application logic |
| STATUS | PASS |

### clinic ↔ campus

| Property | Value |
|----------|-------|
| RELATIONSHIP | Many-to-one |
| FK | clinics.campus_id → campuses.id |
| UNIQUE | (campus_id, name) |
| NULLABLE | No |
| ENFORCEMENT | FK + UNIQUE |
| STATUS | PASS |

### campus ↔ university

| Property | Value |
|----------|-------|
| RELATIONSHIP | Many-to-one |
| FK | campuses.university_id → universities.id |
| UNIQUE | (university_id, name) |
| NULLABLE | No |
| ENFORCEMENT | FK + UNIQUE |
| STATUS | PASS |

---

## 8. AUTHORIZATION FUNCTION CATALOG

### current_user_id()

| Property | Value |
|----------|-------|
| PURPOSE | Get current authenticated user ID |
| INPUTS | None |
| OUTPUT | UUID |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() |
| SCOPE | Current user only |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low |
| TEST | Returns auth.uid() |

### get_user_profile_id()

| Property | Value |
|----------|-------|
| PURPOSE | Get user profile ID for current user |
| INPUTS | None |
| OUTPUT | UUID |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to lookup user_profiles |
| SCOPE | Current user only |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low |
| TEST | Returns user_profiles.id for auth.uid() |

### has_role()

| Property | Value |
|----------|-------|
| PURPOSE | Check if user has specific role |
| INPUTS | p_role_name TEXT |
| OUTPUT | BOOLEAN |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to lookup user_roles |
| SCOPE | Current user only |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low - must check is_active |
| TEST | Returns TRUE/FALSE based on active role |

### has_permission()

| Property | Value |
|----------|-------|
| PURPOSE | Check if user has specific permission |
| INPUTS | p_permission_name TEXT |
| OUTPUT | BOOLEAN |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to lookup user_roles → role_permissions → permissions |
| SCOPE | Current user only |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low - must check is_active |
| TEST | Returns TRUE/FALSE based on active permission |

### get_user_clinic_ids()

| Property | Value |
|----------|-------|
| PURPOSE | Get clinic IDs for current user |
| INPUTS | None |
| OUTPUT | UUID[] |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to lookup provider_assignments |
| SCOPE | Current user's assignments |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low - must check is_active and effective dates |
| TEST | Returns array of active clinic IDs |

### get_user_campus_ids()

| Property | Value |
|----------|-------|
| PURPOSE | Get campus IDs for current user |
| INPUTS | None |
| OUTPUT | UUID[] |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to lookup user_profiles.campus_id |
| SCOPE | Current user only |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low |
| TEST | Returns array with single campus_id |

### get_patient_id_for_user()

| Property | Value |
|----------|-------|
| PURPOSE | Get patient profile ID for current user |
| INPUTS | None |
| OUTPUT | UUID |
| CALLER | Any authenticated user with patient profile |
| AUTHORIZATION | Uses auth.uid() to lookup user_profiles → patient_profiles |
| SCOPE | Current user only |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low - returns NULL if no patient profile |
| TEST | Returns patient_profiles.id or NULL |

### is_patient_owner()

| Property | Value |
|----------|-------|
| PURPOSE | Check if current user owns patient record |
| INPUTS | p_patient_id UUID |
| OUTPUT | BOOLEAN |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to verify patient_profiles.user_profile_id |
| SCOPE | Current user's patient profile |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low - must verify ownership |
| TEST | Returns TRUE only for own patient profile |

### is_provider_assigned_to_encounter()

| Property | Value |
|----------|-------|
| PURPOSE | Check if provider is assigned to encounter |
| INPUTS | p_user_id UUID, p_encounter_id UUID |
| OUTPUT | BOOLEAN |
| CALLER | Any authenticated user |
| AUTHORIZATION | Full chain validation: user → provider_profile → provider_assignment → clinic → service → encounter |
| SCOPE | Specific encounter |
| SECURITY DEFINER | Yes (to bypass RLS for validation) |
| RLS INTERACTION | Used in RLS policies |
| RISK | Medium - must validate complete chain |
| TEST | Returns TRUE only for valid assignments |

### is_provider_assigned_to_patient()

| Property | Value |
|----------|-------|
| PURPOSE | Check if provider is assigned to patient's encounter |
| INPUTS | p_user_id UUID, p_patient_id UUID |
| OUTPUT | BOOLEAN |
| CALLER | Any authenticated user |
| AUTHORIZATION | Validates provider has active assignment for patient's clinic/service |
| SCOPE | Specific patient |
| SECURITY DEFINER | Yes (to bypass RLS for validation) |
| RLS INTERACTION | Used in RLS policies |
| RISK | Medium - must validate complete chain |
| TEST | Returns TRUE only for valid assignments |

### is_user_in_clinic_scope()

| Property | Value |
|----------|-------|
| PURPOSE | Check if user is in clinic scope |
| INPUTS | p_clinic_id UUID |
| OUTPUT | BOOLEAN |
| CALLER | Any authenticated user |
| AUTHORIZATION | Uses auth.uid() to lookup provider_assignments |
| SCOPE | Specific clinic |
| SECURITY DEFINER | No |
| RLS INTERACTION | Used in RLS policies |
| RISK | Low - must check is_active and effective dates |
| TEST | Returns TRUE only for active assignments |

### validate_user_role()

| Property | Value |
|----------|-------|
| PURPOSE | Validate user has required role |
| INPUTS | p_user_id UUID, p_required_role TEXT |
| OUTPUT | BOOLEAN |
| CALLER | SECURITY DEFINER functions |
| AUTHORIZATION | Validates against database role assignments |
| SCOPE | Specific user |
| SECURITY DEFINER | Yes |
| RLS INTERACTION | Used in function authorization |
| RISK | Low - must check is_active |
| TEST | Returns TRUE only for valid roles |

### verify_public_document()

| Property | Value |
|----------|-------|
| PURPOSE | Verify document authenticity |
| INPUTS | p_verification_code TEXT |
| OUTPUT | TABLE (document_type, document_control_number, issued_at, status, valid_until, institution) |
| CALLER | anon (public endpoint) |
| AUTHORIZATION | Validates verification code, returns minimal metadata |
| SCOPE | Specific document |
| SECURITY DEFINER | Yes (to bypass RLS) |
| RLS INTERACTION | Bypasses RLS for verification |
| RISK | Medium - must not expose PHI |
| TEST | Returns minimal metadata for valid codes |

### dispense_prescription()

| Property | Value |
|----------|-------|
| PURPOSE | Dispense medication atomically |
| INPUTS | p_prescription_item_id UUID, p_medicine_batch_id UUID, p_quantity DECIMAL, p_dispensed_by UUID |
| OUTPUT | UUID (dispensing_record_id) |
| CALLER | Authorized pharmacy staff |
| AUTHORIZATION | Validates prescription, medicine, batch, stock |
| SCOPE | Specific prescription item |
| SECURITY DEFINER | Yes (for transaction control) |
| RLS INTERACTION | Bypasses RLS for atomic operation |
| RISK | High - must validate complete chain |
| TEST | Concurrent dispensing of final unit - exactly one succeeds |

---

## 9. SECURITY THREAT MODEL

### THREAT-001: IDOR (Insecure Direct Object Reference)

| Property | Value |
|----------|-------|
| THREAT | User accesses record by knowing UUID |
| ATTACK PATH | Client sends request with arbitrary patient_id |
| CURRENT DEFENSE | RLS policies validate ownership |
| WEAKNESS | If RLS misconfigured, UUID knowledge = access |
| MITIGATION | Strict RLS policies + application validation |
| SEVERITY | CRITICAL |
| TEST | Student A → Student B patient_id → DENY |

### THREAT-002: Privilege Escalation

| Property | Value |
|----------|-------|
| THREAT | User gains unauthorized role |
| ATTACK PATH | Client modifies JWT or role assignment |
| CURRENT DEFENSE | Database-backed role assignments |
| WEAKNESS | If JWT claims trusted without validation |
| MITIGATION | Validate roles against database, not JWT |
| SEVERITY | CRITICAL |
| TEST | Client provides admin role → validate against database → DENY if not actual admin |

### THREAT-003: Role Manipulation

| Property | Value |
|----------|-------|
| THREAT | User modifies own role |
| ATTACK PATH | Client updates user_profiles.user_type |
| CURRENT DEFENSE | Column-level security on sensitive fields |
| WEAKNESS | If UPDATE not restricted |
| MITIGATION | Restrict UPDATE to non-sensitive fields only |
| SEVERITY | CRITICAL |
| TEST | User attempts to update user_type → DENY |

### THREAT-004: Cross-Patient Access

| Property | Value |
|----------|-------|
| THREAT | Provider accesses unauthorized patient |
| ATTACK PATH | Provider queries patient outside assignment |
| CURRENT DEFENSE | RLS policies validate provider assignment |
| WEAKNESS | If RLS misconfigured |
| MITIGATION | Strict RLS policies + application validation |
| SEVERITY | CRITICAL |
| TEST | Doctor A → Patient assigned to Doctor B → DENY |

### THREAT-005: Cross-Clinic Access

| Property | Value |
|----------|-------|
| THREAT | Provider accesses data from wrong clinic |
| ATTACK PATH | Provider queries clinic outside assignment |
| CURRENT DEFENSE | RLS policies validate clinic assignment |
| WEAKNESS | If RLS misconfigured |
| MITIGATION | Strict RLS policies + application validation |
| SEVERITY | HIGH |
| TEST | Provider A (Clinic A) → Clinic B data → DENY |

### THREAT-006: Provider Impersonation

| Property | Value |
|----------|-------|
| THREAT | User impersonates provider |
| ATTACK PATH | Client provides fake provider_id |
| CURRENT DEFENSE | Provider authorization chain validation |
| WEAKNESS | If chain validation incomplete |
| MITIGATION | Complete chain validation in RLS |
| SEVERITY | CRITICAL |
| TEST | User without provider profile → create medical record → DENY |

### THREAT-007: Patient Isolation Failure

| Property | Value |
|----------|-------|
| THREAT | Patient accesses other patient's data |
| ATTACK PATH | Patient queries other patient's records |
| CURRENT DEFENSE | RLS policies validate patient ownership |
| WEAKNESS | If RLS misconfigured |
| MITIGATION | Strict RLS policies + application validation |
| SEVERITY | CRITICAL |
| TEST | Student A → Student B medical record → DENY |

### THREAT-008: RLS Bypass

| Property | Value |
|----------|-------|
| THREAT | Bypass RLS through function |
| ATTACK PATH | Call SECURITY DEFINER function with malicious inputs |
| CURRENT DEFENSE | Function authorization validation |
| WEAKNESS | If function has漏洞 |
| MITIGATION | Strict function authorization + input validation |
| SEVERITY | CRITICAL |
| TEST | Malicious function call → DENY |

### THREAT-009: SECURITY DEFINER Abuse

| Property | Value |
|----------|-------|
| THREAT | SECURITY DEFINER function becomes bypass |
| ATTACK PATH | Function called without proper authorization |
| CURRENT DEFENSE | Function validates auth.uid() |
| WEAKNESS | If function skips validation |
| MITIGATION | Always validate auth.uid() in SECURITY DEFINER functions |
| SEVERITY | CRITICAL |
| TEST | SECURITY DEFINER function without validation → DENY |

### THREAT-010: Storage Leakage

| Property | Value |
|----------|-------|
| THREAT | Clinical documents exposed via Storage |
| ATTACK PATH | Direct URL access to Storage object |
| CURRENT DEFENSE | Private bucket + signed URLs |
| WEAKNESS | If bucket is public or URLs not expired |
| MITIGATION | Private buckets + short-lived signed URLs |
| SEVERITY | HIGH |
| TEST | Direct URL access → DENY |

### THREAT-011: AI Data Leakage

| Property | Value |
|----------|-------|
| THREAT | AI exposes PHI |
| ATTACK PATH | AI queries return unauthorized data |
| CURRENT DEFENSE | AI uses allowlisted functions |
| WEAKNESS | If AI bypasses functions |
| MITIGATION | Strict function allowlist + authorization |
| SEVERITY | HIGH |
| TEST | AI function returns unauthorized data → DENY |

### THREAT-012: Inventory Race Condition

| Property | Value |
|----------|-------|
| THREAT | Concurrent dispensing overspends stock |
| ATTACK PATH | Two transactions dispense final unit |
| CURRENT DEFENSE | Transaction-level locking |
| WEAKNESS | If locking not implemented |
| MITIGATION | Row-level locking in dispensing function |
| SEVERITY | HIGH |
| TEST | Concurrent final unit dispense → exactly one succeeds |

### THREAT-013: Finalized Record Tampering

| Property | Value |
|----------|-------|
| THREAT | Finalized clinical record modified |
| ATTACK PATH | UPDATE on finalized record |
| CURRENT DEFENSE | Trigger prevents update |
| WEAKNESS | If trigger incomplete |
| MITIGATION | Trigger protects ALL fields |
| SEVERITY | CRITICAL |
| TEST | UPDATE finalized record → DENY |

### THREAT-014: QR Enumeration

| Property | Value |
|----------|-------|
| THREAT | Enumerate verification codes |
| ATTACK PATH | Brute-force verification codes |
| CURRENT DEFENSE | High-entropy tokens + rate limiting |
| WEAKNESS | If tokens weak or no rate limiting |
| MITIGATION | 32-byte random tokens + rate limiting |
| SEVERITY | MEDIUM |
| TEST | Brute-force attempts → rate limited |

### THREAT-015: Audit Tampering

| Property | Value |
|----------|-------|
| THREAT | Audit logs modified or deleted |
| ATTACK PATH | UPDATE/DELETE on audit_logs |
| CURRENT DEFENSE | RLS denies UPDATE/DELETE |
| WEAKNESS | If RLS misconfigured |
| MITIGATION | Strict RLS + append-only design |
| SEVERITY | HIGH |
| TEST | UPDATE/DELETE audit_logs → DENY |

---

## 10. REQUIRED ARCHITECTURE CHANGES

### CHANGE-001

**AFFECTED OBJECT:** patient_profiles table
**CHANGE:** Add UNIQUE constraint on user_profile_id
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-002

**AFFECTED OBJECT:** queue_counters table
**CHANGE:** Define atomic queue generation mechanism
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-003

**AFFECTED OBJECT:** is_provider_assigned_to_encounter() function
**CHANGE:** Implement complete chain validation
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-004

**AFFECTED OBJECT:** prevent_finalized_medical_record_update() function
**CHANGE:** Implement complete field protection
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-005

**AFFECTED OBJECT:** dental_record_amendments table
**CHANGE:** Define table structure and trigger
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-006

**AFFECTED OBJECT:** dispense_prescription() function
**CHANGE:** Implement atomic dispensing with row locking
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-007

**AFFECTED OBJECT:** verify_public_document() function
**CHANGE:** Implement minimal metadata return
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-008

**AFFECTED OBJECT:** audit_logs table
**CHANGE:** Define read audit mechanism
**PRIORITY:** CRITICAL
**STATUS:** OPEN

### CHANGE-009

**AFFECTED OBJECT:** All SECURITY DEFINER functions
**CHANGE:** Provide complete function catalog
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-010

**AFFECTED OBJECT:** All RLS policies
**CHANGE:** Provide complete RLS matrix
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-011

**AFFECTED OBJECT:** All security tests
**CHANGE:** Provide executable test specifications
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-012

**AFFECTED OBJECT:** All migrations
**CHANGE:** Provide complete dependency graph
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-013

**AFFECTED OBJECT:** All reports
**CHANGE:** Define report authorization specifications
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-014

**AFFECTED OBJECT:** All tables with status fields
**CHANGE:** Define status transition logic
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-015

**AFFECTED OBJECT:** All clinical tables
**CHANGE:** Define soft delete mechanism
**PRIORITY:** HIGH
**STATUS:** OPEN

### CHANGE-016

**AFFECTED OBJECT:** audit_logs table
**CHANGE:** Define explicit schema
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-017

**AFFECTED OBJECT:** report_export_logs table
**CHANGE:** Define export audit mechanism
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-018

**AFFECTED OBJECT:** login_history table
**CHANGE:** Define RLS policies
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-019

**AFFECTED OBJECT:** Realtime channels
**CHANGE:** Define Realtime security implementation
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-020

**AFFECTED OBJECT:** documents, clearances, certificate_requests tables
**CHANGE:** Define document/clearance relationship
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-021

**AFFECTED OBJECT:** break_glass_access table
**CHANGE:** Define break-glass mechanism
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-022

**AFFECTED OBJECT:** validate_user_role() function
**CHANGE:** Implement role validation
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-023

**AFFECTED OBJECT:** patient_profiles table
**CHANGE:** Define patient identity consistency rules
**PRIORITY:** MEDIUM
**STATUS:** OPEN

### CHANGE-024

**AFFECTED OBJECT:** patient_profiles table
**CHANGE:** Add unique constraint for walk-in patients
**PRIORITY:** LOW
**STATUS:** OPEN

### CHANGE-025

**AFFECTED OBJECT:** All RPC functions
**CHANGE:** Finalize RPC set
**PRIORITY:** LOW
**STATUS:** OPEN

### CHANGE-026

**AFFECTED OBJECT:** odontogram_records table
**CHANGE:** Define immutability trigger
**PRIORITY:** LOW
**STATUS:** OPEN

### CHANGE-027

**AFFECTED OBJECT:** documents table
**CHANGE:** Define token generation mechanism
**PRIORITY:** LOW
**STATUS:** OPEN

### CHANGE-028

**AFFECTED OBJECT:** Test seed data
**CHANGE:** Define explicit test data
**PRIORITY:** LOW
**STATUS:** OPEN

### CHANGE-029

**AFFECTED OBJECT:** All RLS policies
**CHANGE:** Define explicit policies
**PRIORITY:** LOW
**STATUS:** OPEN

---

## 11. MIGRATION DEPENDENCY GRAPH

### Phase 1: Extensions

No dependencies.

### Phase 2: Organizations

Depends on: Phase 1

Tables:
- universities
- campuses

### Phase 3: Identity/Auth Profiles

Depends on: Phase 1

Tables:
- user_profiles

### Phase 4: Roles/Permissions

Depends on: Phase 1

Tables:
- roles
- permissions
- role_permissions
- user_roles

### Phase 5: Providers

Depends on: Phase 3, Phase 4

Tables:
- provider_profiles
- provider_assignments

### Phase 6: Patients

Depends on: Phase 3

Tables:
- patient_profiles

### Phase 7: Clinic Services

Depends on: Phase 2

Tables:
- clinics
- clinic_services

### Phase 8: Queue Infrastructure

Depends on: Phase 6, Phase 7

Tables:
- queue_counters
- queue_entries

### Phase 9: Encounters

Depends on: Phase 6, Phase 7, Phase 8

Tables:
- encounters

### Phase 10: Clinical Records

Depends on: Phase 9

Tables:
- medical_records
- dental_records
- odontogram_records
- fbs_records
- clearances
- clinical_referrals
- consent_records

### Phase 11: Pharmacy

Depends on: Phase 9

Tables:
- medicines
- medicine_batches
- prescriptions
- prescription_items
- dispensing_records
- inventory_transactions

### Phase 12: Documents

Depends on: Phase 6, Phase 7

Tables:
- documents
- document_verification_logs

### Phase 13: System Tables

Depends on: Phase 1

Tables:
- audit_logs
- login_history
- notifications
- announcements
- incidents

### Phase 14: Authorization Helper Functions

Depends on: Phase 3, Phase 4, Phase 5, Phase 6

Functions:
- current_user_id()
- get_user_profile_id()
- has_role()
- has_permission()
- get_user_clinic_ids()
- get_user_campus_ids()
- get_patient_id_for_user()
- is_patient_owner()
- is_provider_assigned_to_encounter()
- is_provider_assigned_to_patient()
- is_user_in_clinic_scope()
- validate_user_role()

### Phase 15: Business Functions

Depends on: Phase 14

Functions:
- dispense_prescription()
- verify_public_document()
- generate_document_control_number()

### Phase 16: Triggers/Invariants

Depends on: Phase 10, Phase 11

Triggers:
- prevent_finalized_medical_record_update()
- prevent_finalized_dental_record_update()
- prevent_odontogram_update()
- validate_medical_record_status_transition()
- prevent_medical_record_delete()
- validate_patient_user_consistency()

### Phase 17: RLS Enablement

Depends on: Phase 17

Tables:
- All tables (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)

### Phase 18: RLS Policies

Depends on: Phase 14, Phase 17

Policies:
- All RLS policies for all tables

### Phase 19: Reporting

Depends on: Phase 18

Views/Functions:
- Reporting views and functions

### Phase 20: Storage Policies

Depends on: Phase 1

Policies:
- Storage bucket policies

### Phase 21: Development Seed Data

Depends on: Phase 18

Data:
- Fictional test data

### Phase 22: Security Tests

Depends on: Phase 21

Tests:
- pgTAP or DO block tests

### Circular Dependencies

** queue_entries ↔ encounters **

Resolution:
1. Create queue_entries without encounter_id FK
2. Create encounters without queue_entry_id FK
3. Add encounter_id FK to queue_entries
4. Add queue_entry_id FK to encounters
5. Add UNIQUE constraint on queue_entry_id

---

## 12. EXECUTABLE SECURITY TEST SPECIFICATION

### RLS TESTS

```sql
-- Test: Patient can only read own medical records
-- Persona: student_a
-- Expected: Only own records returned

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'student_a_user_id';

SELECT COUNT(*) FROM medical_records;
-- ASSERT: Returns only records where patient_id = get_patient_id_for_user()
```

### PATIENT ISOLATION TESTS

```sql
-- Test: Student A cannot access Student B's data
-- Persona: student_a
-- Target: student_b's medical record
-- Expected: 0 rows

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'student_a_user_id';

SELECT COUNT(*) FROM medical_records 
WHERE patient_id = 'student_b_patient_id';
-- ASSERT: 0
```

### PROVIDER TESTS

```sql
-- Test: Doctor cannot access unassigned encounter
-- Persona: doctor_a
-- Target: encounter not assigned to doctor_a
-- Expected: 0 rows

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'doctor_a_user_id';

SELECT COUNT(*) FROM medical_records 
WHERE encounter_id = 'unassigned_encounter_id';
-- ASSERT: 0
```

### ROLE SEPARATION TESTS

```sql
-- Test: Dentist cannot access medical records
-- Persona: dentist_a
-- Target: medical_records table
-- Expected: 0 rows (unless assigned as provider)

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'dentist_a_user_id';

SELECT COUNT(*) FROM medical_records;
-- ASSERT: 0 (unless dentist has medical provider assignment)
```

### ADMIN SEPARATION TESTS

```sql
-- Test: Admin without clinical role cannot access medical records
-- Persona: admin_a
-- Target: medical_records table
-- Expected: 0 rows

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'admin_a_user_id';

SELECT COUNT(*) FROM medical_records;
-- ASSERT: 0
```

### IMMUTABILITY TESTS

```sql
-- Test: Finalized medical record cannot be updated
-- Persona: doctor_a (assigned provider)
-- Target: finalized medical record
-- Expected: Exception raised

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'doctor_a_user_id';

UPDATE medical_records 
SET diagnosis = 'modified'
WHERE id = 'finalized_record_id';
-- ASSERT: Exception "Finalized medical records cannot be modified"
```

### CONCURRENCY TESTS

```sql
-- Test: Concurrent dispensing of final unit
-- Persona: pharmacy_staff_a, pharmacy_staff_b
-- Target: medicine_batch with quantity_on_hand = 1
-- Expected: Exactly one succeeds

-- Transaction 1
BEGIN;
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'pharmacy_staff_a_user_id';
SELECT dispense_prescription('item_id', 'batch_id', 1, 'pharmacy_staff_a_user_id');
COMMIT;

-- Transaction 2 (concurrent)
BEGIN;
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'pharmacy_staff_b_user_id';
SELECT dispense_prescription('item_id', 'batch_id', 1, 'pharmacy_staff_b_user_id');
COMMIT;

-- ASSERT: One transaction succeeds, one fails
```

### INVENTORY TESTS

```sql
-- Test: Expired batch cannot be dispensed
-- Persona: pharmacy_staff_a
-- Target: expired medicine_batch
-- Expected: Exception raised

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'pharmacy_staff_a_user_id';

SELECT dispense_prescription('item_id', 'expired_batch_id', 1, 'pharmacy_staff_a_user_id');
-- ASSERT: Exception "Medicine batch is expired"
```

### QR TESTS

```sql
-- Test: Anonymous cannot access document_verifications table
-- Persona: anon
-- Target: document_verifications table
-- Expected: 0 rows

SET LOCAL role TO anon;

SELECT COUNT(*) FROM document_verification_logs;
-- ASSERT: 0 (RLS denies all)

-- Test: Anonymous can verify document via RPC
-- Persona: anon
-- Target: verify_public_document()
-- Expected: Minimal metadata returned

SET LOCAL role TO anon;

SELECT * FROM verify_public_document('valid_verification_code');
-- ASSERT: Returns document_type, document_control_number, issued_at, status, valid_until, institution
```

### STORAGE TESTS

```sql
-- Test: Clinical documents are not publicly accessible
-- Persona: anon
-- Target: Storage bucket
-- Expected: Access denied

-- Attempt to access signed URL without authorization
-- ASSERT: Access denied
```

### AI TESTS

```sql
-- Test: AI function returns only authorized data
-- Persona: ai_service
-- Target: get_patient_history()
-- Expected: Only data within authorization scope

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'ai_service_user_id';

SELECT * FROM get_patient_history('patient_id');
-- ASSERT: Returns only data within authorization scope
```

### AUDIT TESTS

```sql
-- Test: Audit logs cannot be modified
-- Persona: admin_a
-- Target: audit_logs table
-- Expected: Exception raised

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'admin_a_user_id';

UPDATE audit_logs SET action = 'modified' WHERE id = 'audit_log_id';
-- ASSERT: Exception "Audit logs cannot be modified"

DELETE FROM audit_logs WHERE id = 'audit_log_id';
-- ASSERT: Exception "Audit logs cannot be deleted"
```

### IDOR TESTS

```sql
-- Test: Knowing UUID alone does not grant access
-- Persona: student_a
-- Target: student_b's patient profile UUID
-- Expected: 0 rows

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'student_a_user_id';

SELECT COUNT(*) FROM patient_profiles 
WHERE id = 'student_b_patient_profile_id';
-- ASSERT: 0
```

---

## 13. RISK REGISTER

| ID | Risk | Severity | Impact | Mitigation | Status |
|----|------|----------|--------|------------|--------|
| RISK-001 | Missing UNIQUE constraint on patient_profiles.user_profile_id | CRITICAL | Multiple patient profiles per user | Add UNIQUE constraint | OPEN |
| RISK-002 | Queue number race condition | CRITICAL | Duplicate queue numbers | Implement atomic queue generation | OPEN |
| RISK-003 | Incomplete provider authorization chain | CRITICAL | Unauthorized provider access | Implement full chain validation | OPEN |
| RISK-004 | Incomplete medical record immutability | CRITICAL | Finalized record tampering | Implement complete field protection | OPEN |
| RISK-005 | Incomplete dental record immutability | CRITICAL | Finalized record tampering | Implement complete field protection | OPEN |
| RISK-006 | Non-atomic inventory dispensing | CRITICAL | Stock overspending | Implement atomic dispensing | OPEN |
| RISK-007 | PHI exposure via QR verification | CRITICAL | Patient data exposure | Implement minimal metadata return | OPEN |
| RISK-008 | Missing read audit mechanism | CRITICAL | Unaudited data access | Implement read audit | OPEN |
| RISK-009 | Incomplete SECURITY DEFINER review | HIGH | RLS bypass | Complete function catalog | OPEN |
| RISK-010 | Missing RLS matrix | HIGH | Policy gaps | Provide complete matrix | OPEN |
| RISK-011 | Missing executable tests | HIGH | Unverified security | Provide test specifications | OPEN |
| RISK-012 | Missing migration dependency graph | HIGH | Migration failures | Provide dependency graph | OPEN |
| RISK-013 | Missing report authorization | HIGH | PHI exposure in reports | Define report authorization | OPEN |
| RISK-014 | Missing status transition logic | HIGH | Invalid state transitions | Define transition logic | OPEN |
| RISK-015 | Missing soft delete mechanism | HIGH | Data loss | Define soft delete | OPEN |
| RISK-016 | Incomplete audit log schema | MEDIUM | PHI in audit logs | Define explicit schema | OPEN |
| RISK-017 | Missing export audit | MEDIUM | Unaudited exports | Define export audit | OPEN |
| RISK-018 | Missing login_history RLS | MEDIUM | Login history exposure | Define RLS policies | OPEN |
| RISK-019 | Missing Realtime security | MEDIUM | Side channel exposure | Define Realtime security | OPEN |
| RISK-020 | Undefined document/clearance relationship | MEDIUM | Data duplication | Define relationship | OPEN |
| RISK-021 | Missing break-glass mechanism | MEDIUM | Emergency access issues | Define break-glass | OPEN |
| RISK-022 | Missing role validation | MEDIUM | Privilege escalation | Implement role validation | OPEN |
| RISK-023 | Missing patient identity consistency | MEDIUM | Identity conflicts | Define consistency rules | OPEN |
| RISK-024 | Missing walk-in patient uniqueness | LOW | Duplicate walk-in records | Add unique constraint | OPEN |
| RISK-025 | Unfinalized RPC set | LOW | Incomplete API | Finalize RPC set | OPEN |
| RISK-026 | Missing odontogram immutability | LOW | History tampering | Implement immutability | OPEN |
| RISK-027 | Weak verification tokens | LOW | Token enumeration | Implement strong tokens | OPEN |
| RISK-028 | Non-deterministic test data | LOW | Inconsistent tests | Define test data | OPEN |
| RISK-029 | Implicit RLS policies | LOW | Policy gaps | Define explicit policies | OPEN |

---

## 14. FINAL ARCHITECTURE STATUS

**ARCHITECTURE STATUS: BLOCKED**

### Blocking Issues

1. **Missing UNIQUE constraint on patient_profiles.user_profile_id** (CRITICAL)
2. **Unspecified atomic queue generation mechanism** (CRITICAL)
3. **Incomplete provider authorization chain implementation** (CRITICAL)
4. **Incomplete medical record immutability implementation** (CRITICAL)
5. **Incomplete dental record immutability implementation** (CRITICAL)
6. **Non-atomic inventory dispensing implementation** (CRITICAL)
7. **PHI exposure risk in QR verification** (CRITICAL)
8. **Missing read audit mechanism** (CRITICAL)

### Required Actions

1. Provide explicit table definitions with all constraints
2. Provide explicit function implementations
3. Provide explicit trigger implementations
4. Provide complete RLS matrix
5. Provide complete function catalog
6. Provide executable test specifications
7. Provide migration dependency graph

### Next Steps

1. Resolve all CRITICAL findings
2. Resolve all HIGH findings
3. Re-evaluate all hard-stop gates
4. Present revised architecture for approval

---

========================================
UCIS PRE-MIGRATION ARCHITECTURE GATE
====================================

STATUS:
BLOCKED

CRITICAL FINDINGS:
8

HIGH FINDINGS:
12

MEDIUM FINDINGS:
9

LOW FINDINGS:
5

HARD-STOP GATES PASSED:
18

HARD-STOP GATES FAILED:
6

UNRESOLVED BLOCKERS:
8

PRODUCTION MIGRATION SQL GENERATED:
NO

PRODUCTION MIGRATION FILES CREATED:
NO

DATABASE MODIFIED:
NO

AWAITING HUMAN ARCHITECTURE APPROVAL:
YES
===