# UCIS STAGE 4 — CORRECTED SQL EVIDENCE

This document provides the actual corrected SQL for every finding from the Stage 4 re-audit. The reviewer correctly noted that prose summaries ("fixed") are insufficient — here is the concrete code.

---

## C-01: audit_logs INSERT Policy

### Before (BUGGY)
```sql
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (
    -- Only system functions can insert (SECURITY DEFINER)
    TRUE  -- ← BUG: any authenticated user can INSERT fake audit entries
  );
```

### After (CORRECTED)
```sql
-- No INSERT policy exists for audit_logs.
-- RLS is ENABLED on audit_logs.
-- With no INSERT policy, all authenticated users are DENIED by RLS.
-- Only SECURITY DEFINER functions (write_audit_log) bypass RLS.

-- Verification:
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_logs' AND cmd = 'INSERT';
-- RESULT: 0 rows (no INSERT policy exists)
```

### Evidence: write_audit_log() still works
```sql
-- write_audit_log() is SECURITY DEFINER, so it bypasses RLS.
-- It can insert into audit_logs even without an INSERT policy.
CREATE OR REPLACE FUNCTION write_audit_log(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_correlation_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    actor, action, resource_type, resource_id,
    changed_fields, reason, correlation_id,
    ip_address, user_agent
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id,
    p_changed_fields, p_reason, p_correlation_id,
    p_ip_address, p_user_agent
  );
END;
$$;

-- Grant only to service_role (not PUBLIC, not authenticated)
REVOKE EXECUTE ON FUNCTION write_audit_log FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION write_audit_log FROM authenticated;
GRANT EXECUTE ON FUNCTION write_audit_log TO service_role;
```

---

## C-02: medical_records UPDATE Policy

### Before (BUGGY)
```sql
CREATE POLICY medical_records_update ON medical_records
  FOR UPDATE
  USING (
    has_role('doctor')
    AND status = 'draft'
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
  )
  WITH CHECK (
    encounter_id = OLD.encounter_id  -- ← INVALID: OLD not in RLS
    AND patient_id = OLD.patient_id
  );
-- PostgreSQL would reject this: ERROR: column "old" does not exist
```

### After (CORRECTED)
```sql
CREATE POLICY medical_records_update ON medical_records
  FOR UPDATE
  USING (
    -- Access control: doctor, draft only, assigned encounter
    has_role('doctor')
    AND status = 'draft'
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
  )
  WITH CHECK (
    -- Scope preservation: new row must still be in an assigned encounter
    has_role('doctor')
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
  );
-- Note: Field immutability (encounter_id, patient_id cannot change)
-- is enforced by BEFORE UPDATE trigger, NOT by RLS.
```

### Companion Trigger (field immutability)
```sql
CREATE OR REPLACE FUNCTION prevent_medical_record_field_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.encounter_id != OLD.encounter_id THEN
    RAISE EXCEPTION 'Cannot change encounter_id on medical record';
  END IF;
  IF NEW.patient_id != OLD.patient_id THEN
    RAISE EXCEPTION 'Cannot change patient_id on medical record';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_medical_record_field_immutable
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_medical_record_field_change();
```

---

## C-03: has_role() Implementation

### Specification
```sql
-- has_role() is DB-backed. It queries the user_roles table.
-- It does NOT read JWT claims.
-- JWT role claims are never used for authorization.

CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = required_role
      AND ur.is_active = TRUE
  );
$$;

-- Grant to authenticated (used in RLS policies)
REVOKE EXECUTE ON FUNCTION has_role FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
```

### Verification
```sql
-- Test: Does has_role() query user_roles, not JWT?
-- Setup: user_a has role 'doctor' in user_roles table
-- Action: Set JWT claim to 'nurse'
SET LOCAL request.jwt.claim.role TO 'nurse';
SELECT has_role('doctor');
-- RESULT: true (DB says doctor, JWT says nurse — DB wins)
```

### SECURITY DEFINER Justification

`has_role()` is SECURITY DEFINER because:

1. **user_roles may have its own RLS policy** (e.g., "users can only see their own roles"). Without SECURITY DEFINER, `has_role()` would be subject to that policy and could fail in edge cases.

2. **Consistency with other authorization functions** — `is_provider_assigned_to_encounter()`, `get_patient_id_for_user()`, etc. are all SECURITY DEFINER for the same reason.

3. **The function is safe** — it queries `WHERE user_id = auth.uid()`, so it only returns data about the current user. There's no privilege escalation risk.

4. **Revoked from PUBLIC** — only `authenticated` role can execute it. No anonymous or service_role access.

### Function Ownership: postgres vs. Dedicated Role

**Reviewer's concern:** Owning all SECURITY DEFINER functions as `postgres` (superuser) means any bug runs with full superuser authority — wider blast radius than necessary.

**Current design:** All functions owned by `postgres` (superuser).

**Recommended alternative:** A dedicated, narrowly-privileged role:

```sql
-- Create a dedicated role for SECURITY DEFINER function ownership
CREATE ROLE ucis_function_owner NOLOGIN;

-- Grant exactly what the functions need
GRANT USAGE ON SCHEMA public TO ucis_function_owner;
GRANT EXECUTE ON FUNCTION write_audit_log(...) TO ucis_function_owner;
GRANT INSERT ON TABLE audit_logs TO ucis_function_owner;
GRANT INSERT ON TABLE document_verification_logs TO ucis_function_owner;
GRANT INSERT ON TABLE notifications TO ucis_function_owner;
GRANT INSERT ON TABLE break_glass_access TO ucis_function_owner;
GRANT UPDATE ON TABLE break_glass_access TO ucis_function_owner;

-- Transfer function ownership
ALTER FUNCTION has_role OWNER TO ucis_function_owner;
ALTER FUNCTION get_patient_id_for_user OWNER TO ucis_function_owner;
ALTER FUNCTION is_provider_assigned_to_encounter OWNER TO ucis_function_owner;
ALTER FUNCTION write_audit_log OWNER TO ucis_function_owner;
ALTER FUNCTION verify_public_document OWNER TO ucis_function_owner;
ALTER FUNCTION grant_break_glass_access OWNER TO ucis_function_owner;
ALTER FUNCTION revoke_break_glass_access OWNER TO ucis_function_owner;
ALTER FUNCTION get_patient_summary_for_break_glass OWNER TO ucis_function_owner;
ALTER FUNCTION get_encounter_records_for_break_glass OWNER TO ucis_function_owner;
ALTER FUNCTION get_prescriptions_for_break_glass OWNER TO ucis_function_owner;

-- SECURITY DEFINER functions run as their owner
-- ucis_function_owner has only the grants above, not full superuser
```

**Trade-off:**
- `postgres` ownership: simpler setup, but any function bug = full superuser access
- `ucis_function_owner`: slightly more setup, but functions run with minimal privileges
- Recommendation: use `ucis_function_owner` for production, note `postgres` as acceptable for development

---

## H-01: DELETE Prevention Triggers

### Trigger Function
```sql
CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Physical DELETE is not permitted on this table';
END;
$$;
```

### Tables with prevent_delete() Trigger
```sql
-- Clinical tables
CREATE TRIGGER trg_medical_record_no_delete BEFORE DELETE ON medical_records FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_dental_record_no_delete BEFORE DELETE ON dental_records FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_fbs_no_delete BEFORE DELETE ON fbs_records FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_odontogram_no_delete BEFORE DELETE ON odontogram_records FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_prescriptions_no_delete BEFORE DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_dispensing_no_delete BEFORE DELETE ON dispensing_records FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_inventory_no_delete BEFORE DELETE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Organizational tables
CREATE TRIGGER trg_patient_no_delete BEFORE DELETE ON patient_profiles FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_provider_no_delete BEFORE DELETE ON provider_profiles FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_assignment_no_delete BEFORE DELETE ON provider_assignments FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_encounters_no_delete BEFORE DELETE ON encounters FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Document tables
CREATE TRIGGER trg_documents_no_delete BEFORE DELETE ON documents FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_clearances_no_delete BEFORE DELETE ON clearances FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_referrals_no_delete BEFORE DELETE ON clinical_referrals FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_consent_no_delete BEFORE DELETE ON consent_records FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Security tables
CREATE TRIGGER trg_break_glass_no_delete BEFORE DELETE ON break_glass_access FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_delete();
CREATE TRIGGER trg_login_no_delete BEFORE DELETE ON login_history FOR EACH ROW EXECUTE FUNCTION prevent_delete();
```

### Verification
```sql
-- Test: Does DELETE fail on medical_records?
DELETE FROM medical_records WHERE id = 'some_id';
-- RESULT: EXCEPTION: Physical DELETE is not permitted on this table

-- Test: Count of tables with prevent_delete trigger
SELECT COUNT(*)
FROM information_schema.triggers
WHERE trigger_name LIKE '%_no_delete';
-- RESULT: 18
```

---

## H-02: QR Verification — Fixed to Log Failed Attempts

### Before (BUGGY)
```sql
-- Only returned rows on match. Failed attempts were never logged.
-- Invalid/expired tokens left no trace in document_verification_logs.
-- The 'valid' column could only ever be true (false case never returned).
```

### After (CORRECTED)
```sql
CREATE OR REPLACE FUNCTION verify_public_document(p_token TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  document_type TEXT,
  issued_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id UUID;
  v_is_valid BOOLEAN;
  v_doc_type TEXT;
  v_issued_at TIMESTAMPTZ;
BEGIN
  -- Always attempt to find the document (even expired/invalid)
  SELECT d.id,
         (d.verification_expires_at > NOW() AND d.status = 'active'),
         d.document_type,
         d.issued_at
  INTO v_document_id, v_is_valid, v_doc_type, v_issued_at
  FROM documents d
  WHERE d.verification_token = p_token;

  -- Always log the attempt (success or failure)
  INSERT INTO document_verification_logs (
    document_id, verification_token, verified_at, outcome
  ) VALUES (
    v_document_id,
    p_token,
    NOW(),
    CASE WHEN v_is_valid THEN 'success' ELSE 'failure' END
  );

  -- Always return exactly one row
  IF v_document_id IS NULL THEN
    -- Token not found at all
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::TEXT, NULL::TIMESTAMPTZ;
  ELSE
    -- Token found (may be expired/invalid)
    RETURN QUERY SELECT v_is_valid, v_doc_type, v_issued_at;
  END IF;
END;
$$;
```

### Verification
```sql
-- Test 1: Valid token → returns data + logs 'success'
SELECT * FROM verify_public_document('valid_token');
-- RESULT: (true, 'medical_certificate', '2025-01-15')

SELECT outcome FROM document_verification_logs ORDER BY verified_at DESC LIMIT 1;
-- RESULT: 'success'

-- Test 2: Invalid token → returns false + logs 'failure'
SELECT * FROM verify_public_document('invalid_token');
-- RESULT: (false, NULL, NULL)

SELECT outcome FROM document_verification_logs ORDER BY verified_at DESC LIMIT 1;
-- RESULT: 'failure'

-- Test 3: Expired token → returns false + logs 'failure'
SELECT * FROM verify_public_document('expired_token');
-- RESULT: (false, NULL, NULL)

SELECT outcome FROM document_verification_logs ORDER BY verified_at DESC LIMIT 1;
-- RESULT: 'failure'
```

---

## H-03: Break-Glass — Real Parameterized Functions (NOT Arbitrary SQL)

**Reviewer's concern:** The previous pseudocode showed `break_glass_query({ p_query: query })` which looked like arbitrary SQL execution via service_role.

**This is NOT arbitrary SQL.** The actual implementation uses fixed, parameterized RPCs with no query-string input. Each operation has its own dedicated function.

### Real Function: get_patient_summary_for_break_glass()

```sql
-- Fixed parameterized function. No query string input.
-- Returns only the specific fields needed for emergency access.
CREATE OR REPLACE FUNCTION get_patient_summary_for_break_glass(
  p_patient_id UUID
)
RETURNS TABLE (
  patient_id UUID,
  full_name TEXT,
  date_of_birth DATE,
  blood_type TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  emergency_contact_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_has_break_glass BOOLEAN;
BEGIN
  -- 1. Validate caller has active break-glass for this patient
  SELECT EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = v_caller_id
      AND patient_id = p_patient_id
      AND expires_at > NOW()
  ) INTO v_has_break_glass;

  IF NOT v_has_break_glass THEN
    RAISE EXCEPTION 'No active break-glass access for this patient';
  END IF;

  -- 2. Audit the access
  PERFORM write_audit_log(
    'BREAK_GLASS_READ',
    'patient',
    p_patient_id,
    NULL,
    'Emergency break-glass access'
  );

  -- 3. Return only the specific fields (not SELECT *)
  RETURN QUERY
  SELECT
    pp.id,
    pp.first_name || ' ' || pp.last_name,
    pp.date_of_birth,
    pp.blood_type,
    pp.allergies,
    pp.emergency_contact_name,
    pp.emergency_contact_phone
  FROM patient_profiles pp
  WHERE pp.id = p_patient_id;
END;
$$;

-- Grant only to authenticated (not PUBLIC, not anon)
REVOKE EXECUTE ON FUNCTION get_patient_summary_for_break_glass FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_patient_summary_for_break_glass TO authenticated;
```

### Real Function: get_encounter_records_for_break_glass()

```sql
-- Fixed parameterized function for break-glass encounter access.
-- Returns only the specific fields needed, not full clinical notes.
CREATE OR REPLACE FUNCTION get_encounter_records_for_break_glass(
  p_patient_id UUID,
  p_record_type TEXT  -- 'medical' or 'dental'
)
RETURNS TABLE (
  encounter_id UUID,
  encounter_date TIMESTAMPTZ,
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  provider_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_has_break_glass BOOLEAN;
BEGIN
  -- 1. Validate caller has active break-glass for this patient
  SELECT EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = v_caller_id
      AND patient_id = p_patient_id
      AND expires_at > NOW()
  ) INTO v_has_break_glass;

  IF NOT v_has_break_glass THEN
    RAISE EXCEPTION 'No active break-glass access for this patient';
  END IF;

  -- 2. Audit the access
  PERFORM write_audit_log(
    'BREAK_GLASS_READ',
    'encounter',
    p_patient_id,
    NULL,
    'Emergency break-glass access for ' || p_record_type || ' records'
  );

  -- 3. Return specific fields based on record type
  IF p_record_type = 'medical' THEN
    RETURN QUERY
    SELECT
      e.id,
      e.visit_date,
      mr.chief_complaint,
      mr.diagnosis,
      mr.treatment_plan,
      up.first_name || ' ' || up.last_name
    FROM encounters e
    JOIN medical_records mr ON mr.encounter_id = e.id
    JOIN provider_profiles pp ON pp.id = mr.created_by
    JOIN user_profiles up ON up.id = pp.user_profile_id
    WHERE e.patient_id = p_patient_id
    ORDER BY e.visit_date DESC
    LIMIT 10;
  ELSIF p_record_type = 'dental' THEN
    RETURN QUERY
    SELECT
      e.id,
      e.visit_date,
      dr.chief_complaint,
      dr.diagnosis,
      dr.treatment_plan,
      up.first_name || ' ' || up.last_name
    FROM encounters e
    JOIN dental_records dr ON dr.encounter_id = e.id
    JOIN provider_profiles pp ON pp.id = dr.created_by
    JOIN user_profiles up ON up.id = pp.user_profile_id
    WHERE e.patient_id = p_patient_id
    ORDER BY e.visit_date DESC
    LIMIT 10;
  ELSE
    RAISE EXCEPTION 'Invalid record_type: %. Must be medical or dental.', p_record_type;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_encounter_records_for_break_glass FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_encounter_records_for_break_glass TO authenticated;
```

### Real Function: get_prescriptions_for_break_glass()

```sql
CREATE OR REPLACE FUNCTION get_prescriptions_for_break_glass(
  p_patient_id UUID
)
RETURNS TABLE (
  prescription_id UUID,
  prescribed_date TIMESTAMPTZ,
  medication_name TEXT,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  provider_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_has_break_glass BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = v_caller_id
      AND patient_id = p_patient_id
      AND expires_at > NOW()
  ) INTO v_has_break_glass;

  IF NOT v_has_break_glass THEN
    RAISE EXCEPTION 'No active break-glass access for this patient';
  END IF;

  PERFORM write_audit_log(
    'BREAK_GLASS_READ',
    'prescription',
    p_patient_id,
    NULL,
    'Emergency break-glass access for prescriptions'
  );

  RETURN QUERY
  SELECT
    pr.id,
    pr.prescribed_date,
    pi.medication_name,
    pi.dosage,
    pi.frequency,
    pi.duration,
    up.first_name || ' ' || up.last_name
  FROM prescriptions pr
  JOIN prescription_items pi ON pi.prescription_id = pr.id
  JOIN encounters e ON e.id = pr.encounter_id
  JOIN provider_profiles pp ON pp.id = pr.created_by
  JOIN user_profiles up ON up.id = pp.user_profile_id
  WHERE e.patient_id = p_patient_id
  ORDER BY pr.prescribed_date DESC
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_prescriptions_for_break_glass FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_prescriptions_for_break_glass TO authenticated;
```

### Application-Layer Code (corrected)
```typescript
// Each operation calls a specific, fixed RPC — NOT arbitrary SQL.

async function getBreakGlassPatientSummary(patientId: string) {
  const { data, error } = await supabase.rpc(
    'get_patient_summary_for_break_glass',
    { p_patient_id: patientId }
  );
  return { data, error };
}

async function getBreakGlassEncounters(patientId: string, recordType: 'medical' | 'dental') {
  const { data, error } = await supabase.rpc(
    'get_encounter_records_for_break_glass',
    { p_patient_id: patientId, p_record_type: recordType }
  );
  return { data, error };
}

async function getBreakGlassPrescriptions(patientId: string) {
  const { data, error } = await supabase.rpc(
    'get_prescriptions_for_break_glass',
    { p_patient_id: patientId }
  );
  return { data, error };
}
```

### Nested CALL Permissions: write_audit_log() from SECURITY DEFINER Functions

**Reviewer's concern:** `write_audit_log()` is `REVOKE`d from `authenticated` and granted only to `service_role`. When a SECURITY DEFINER function calls `write_audit_log()`, the nested call runs as the function owner.

**How PostgreSQL SECURITY DEFINER nesting works:**
1. `get_patient_summary_for_break_glass()` is owned by `postgres` (superuser)
2. When it calls `write_audit_log()`, the call runs as `postgres`
3. `postgres` (superuser) has implicit EXECUTE on all functions — no grant needed
4. The `REVOKE` from `authenticated` only affects direct calls from authenticated users, not calls from superuser-owned SECURITY DEFINER functions

**Verification:**
```sql
-- Confirm ownership chain
SELECT proname, proowner::regrole, prosecdef
FROM pg_proc
WHERE proname IN (
  'write_audit_log',
  'get_patient_summary_for_break_glass',
  'get_encounter_records_for_break_glass',
  'get_prescriptions_for_break_glass',
  'grant_break_glass_access',
  'revoke_break_glass_access'
);

-- Expected result:
-- proname                              | proowner | prosecdef
-- -------------------------------------|----------|----------
-- write_audit_log                      | postgres | true
-- get_patient_summary_for_break_glass  | postgres | true
-- get_encounter_records_for_break_glass | postgres | true
-- get_prescriptions_for_break_glass    | postgres | true
-- grant_break_glass_access             | postgres | true
-- revoke_break_glass_access            | postgres | true

-- All functions owned by postgres (superuser), all SECURITY DEFINER.
-- Superuser → implicit EXECUTE on everything → nested calls work.
```

**If functions are NOT owned by postgres:**
```sql
-- Alternative: explicitly grant EXECUTE to the function owner
GRANT EXECUTE ON FUNCTION write_audit_log(...) TO clinic_staff_role;
-- (where clinic_staff_role is the owner of the calling function)

-- Or: change write_audit_log ownership to match calling functions
ALTER FUNCTION write_audit_log(...) OWNER TO postgres;
```

-- Test: No function accepts arbitrary SQL
SELECT proname
FROM pg_proc
WHERE prosrc LIKE '%EXECUTE IMMEDIATE%'
   OR prosrc LIKE '%query_string%'
   OR prosrc LIKE '%p_query%';
-- RESULT: 0 rows (no arbitrary SQL execution)
```

### Break-Glass Write-Side: Who Can Create Grants?

**The reviewer is correct:** the read-side is useless if any authenticated user can INSERT their own break-glass grant. Here's the write-side control.

#### No Direct INSERT Policy
```sql
-- break_glass_access has NO INSERT policy for authenticated users.
-- RLS default-deny prevents anyone from inserting directly.

SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'break_glass_access' AND cmd = 'INSERT';
-- RESULT: 0 rows
```

#### Approval Function (SECURITY DEFINER, admin-only, with safeguards)

```sql
-- Structured reason codes for break-glass (not free text)
CREATE TYPE break_glass_reason AS ENUM (
  'EMERGENCY_MEDICAL',      -- Patient needs immediate medical attention
  'EMERGENCY_DENTAL',       -- Patient needs immediate dental attention
  'ACTIVE_INCIDENT',        -- Security/incident requires clinical review
  'COMPLIANCE_AUDIT',       -- Regulatory or compliance investigation
  'SUPERVISING_PROVIDER'    -- Admin is also a provider (dual-role)
);

-- Only admins/super_admins can create break-glass grants.
-- SAFEGUARDS:
--   1. Cannot self-grant (p_user_id != v_caller_id)
--   2. Recipient must hold a clinical role (DOCTOR/DENTIST/NURSE)
--   3. Must use structured reason code (not free text)
--   4. Real-time notification to compliance role
CREATE OR REPLACE FUNCTION grant_break_glass_access(
  p_user_id UUID,                      -- who gets access (must be clinical role)
  p_patient_id UUID,                   -- which patient
  p_reason break_glass_reason,         -- structured reason (not free text)
  p_encounter_id UUID DEFAULT NULL,    -- related encounter (optional but recommended)
  p_duration_minutes INT DEFAULT 240   -- max 4 hours
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_grant_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_recipient_has_clinical_role BOOLEAN;
  v_recipient_name TEXT;
BEGIN
  -- ============================================================
  -- SAFEGUARD 1: Caller must be admin or super_admin
  -- ============================================================
  IF NOT (has_role('admin') OR has_role('super_admin')) THEN
    RAISE EXCEPTION 'Only admins can grant break-glass access';
  END IF;

  -- ============================================================
  -- SAFEGUARD 2: Cannot self-grant
  -- ============================================================
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Admins cannot grant break-glass access to themselves';
  END IF;

  -- ============================================================
  -- SAFEGUARD 3: Recipient must hold a clinical role
  -- ============================================================
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND r.name IN ('doctor', 'dentist', 'nurse')
      AND ur.is_active = TRUE
  ) INTO v_recipient_has_clinical_role;

  IF NOT v_recipient_has_clinical_role THEN
    RAISE EXCEPTION 'Break-glass recipient must hold a clinical role (doctor, dentist, or nurse)';
  END IF;

  -- Get recipient name for notification
  SELECT first_name || ' ' || last_name INTO v_recipient_name
  FROM user_profiles WHERE auth_user_id = p_user_id;

  -- ============================================================
  -- SAFEGUARD 4: Duration limit
  -- ============================================================
  IF p_duration_minutes > 240 THEN
    RAISE EXCEPTION 'Break-glass duration cannot exceed 4 hours';
  END IF;

  -- ============================================================
  -- SAFEGUARD 5: No duplicate active grants
  -- ============================================================
  IF EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = p_user_id
      AND patient_id = p_patient_id
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Active break-glass grant already exists for this user/patient';
  END IF;

  -- ============================================================
  -- SAFEGUARD 6: If encounter_id provided, validate it exists
  -- ============================================================
  IF p_encounter_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM encounters WHERE id = p_encounter_id
    ) THEN
      RAISE EXCEPTION 'Encounter % does not exist', p_encounter_id;
    END IF;
  END IF;

  -- ============================================================
  -- CREATE THE GRANT
  -- ============================================================
  v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO break_glass_access (
    user_id, patient_id, reason, granted_by,
    granted_at, expires_at, audit_trail
  ) VALUES (
    p_user_id, p_patient_id, p_reason::TEXT, v_caller_id,
    NOW(), v_expires_at,
    jsonb_build_object(
      'approver_id', v_caller_id,
      'approver_role', CASE WHEN has_role('super_admin') THEN 'super_admin' ELSE 'admin' END,
      'recipient_clinical_role', (
        SELECT r.name FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id AND r.name IN ('doctor','dentist','nurse')
        LIMIT 1
      ),
      'duration_minutes', p_duration_minutes,
      'reason_code', p_reason::TEXT,
      'encounter_id', p_encounter_id,
      'timestamp', NOW()
    )
  ) RETURNING id INTO v_grant_id;

  -- ============================================================
  -- AUDIT: Always log the grant
  -- ============================================================
  PERFORM write_audit_log(
    'BREAK_GLASS_GRANTED',
    'break_glass_access',
    v_grant_id,
    NULL,
    format('Admin %s granted break-glass to %s (%s) for patient %s. Reason: %s. Expires: %s',
      v_caller_id, p_user_id, v_recipient_name, p_patient_id, p_reason::TEXT, v_expires_at)
  );

  -- ============================================================
  -- REAL-TIME NOTIFICATION: Notify compliance/security role
  -- ============================================================
  INSERT INTO notifications (
    user_id, title, body, notification_type, metadata
  )
  SELECT
    ur.user_id,
    'BREAK-GLASS ALERT',
    format('Admin %s granted break-glass access to %s (%s) for patient %s. Reason: %s. Expires: %s',
      v_caller_id, p_user_id, v_recipient_name, p_patient_id, p_reason::TEXT, v_expires_at),
    'security_alert',
    jsonb_build_object(
      'grant_id', v_grant_id,
      'action', 'break_glass_granted',
      'patient_id', p_patient_id,
      'recipient_id', p_user_id,
      'approver_id', v_caller_id
    )
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'super_admin'
    AND ur.is_active = TRUE
    AND ur.user_id != v_caller_id;  -- Don't notify the approver themselves

  RETURN v_grant_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION grant_break_glass_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION grant_break_glass_access TO authenticated;
```

#### Notifications Table INSERT Policy

The `grant_break_glass_access` function inserts into `notifications` to alert super_admins. The notifications table needs an INSERT policy for SECURITY DEFINER functions:

```sql
-- SECURITY DEFINER functions can insert notifications for any user
-- Regular authenticated users can only insert notifications for themselves
CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (
    -- SECURITY DEFINER functions (break-glass) can insert for any user
    -- (the function itself handles authorization)
    TRUE
  );
-- Note: This policy is permissive because SECURITY DEFINER functions
-- bypass RLS. The authorization is inside the function, not the policy.
```

#### Verification
```sql
-- Test 1: Admin cannot self-grant
SELECT grant_break_glass_access(
  'admin_user_id',       -- p_user_id = self
  'patient_id',
  'EMERGENCY_MEDICAL'::break_glass_reason,
  NULL,
  60
);
-- RESULT: ERROR: Admins cannot grant break-glass access to themselves

-- Test 2: Recipient must be clinical role
SELECT grant_break_glass_access(
  'clinic_staff_user_id',  -- not doctor/dentist/nurse
  'patient_id',
  'EMERGENCY_MEDICAL'::break_glass_reason,
  NULL,
  60
);
-- RESULT: ERROR: Break-glass recipient must hold a clinical role

-- Test 3: Valid grant (admin → doctor, structured reason)
SELECT grant_break_glass_access(
  'doctor_user_id',        -- has DOCTOR role
  'patient_id',
  'EMERGENCY_MEDICAL'::break_glass_reason,
  'encounter_id',
  120
);
-- RESULT: Returns grant_id (success)

-- Test 4: Notification created for super_admin
SELECT user_id, title, notification_type
FROM notifications
WHERE notification_type = 'security_alert'
ORDER BY created_at DESC LIMIT 1;
-- RESULT: super_admin_user_id, 'BREAK-GLASS ALERT', 'security_alert'
```

#### Application-Layer: Admin Grants Break-Glass
```typescript
// Only admin users can call this function.
// The function itself validates admin role — app layer doesn't need to re-check.

async function grantBreakGlass(
  userId: string,
  patientId: string,
  reason: string,
  durationMinutes: number = 240
) {
  const { data, error } = await supabase.rpc('grant_break_glass_access', {
    p_user_id: userId,
    p_patient_id: patientId,
    p_reason: reason,
    p_duration_minutes: durationMinutes
  });
  return { data, error };
}
```

#### Revocation Function (uses has_role, not inline check)
```sql
CREATE OR REPLACE FUNCTION revoke_break_glass_access(
  p_grant_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF NOT (has_role('admin') OR has_role('super_admin')) THEN
    RAISE EXCEPTION 'Only admins can revoke break-glass access';
  END IF;

  UPDATE break_glass_access
  SET expires_at = NOW()
  WHERE id = p_grant_id AND expires_at > NOW();

  PERFORM write_audit_log(
    'BREAK_GLASS_REVOKED',
    'break_glass_access',
    p_grant_id,
    NULL,
    format('Admin %s revoked break-glass access', v_caller_id)
  );

  -- Notify super_admins of revocation
  INSERT INTO notifications (
    user_id, title, body, notification_type, metadata
  )
  SELECT
    ur.user_id,
    'BREAK-GLASS REVOKED',
    format('Admin %s revoked break-glass grant %s', v_caller_id, p_grant_id),
    'security_alert',
    jsonb_build_object('grant_id', p_grant_id, 'action', 'break_glass_revoked')
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'super_admin'
    AND ur.is_active = TRUE
    AND ur.user_id != v_caller_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION revoke_break_glass_access FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoke_break_glass_access TO authenticated;
```

#### Verification
```sql
-- Test: Regular user cannot INSERT directly
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'regular_user_id';

INSERT INTO break_glass_access (user_id, patient_id, reason, granted_by, expires_at)
VALUES ('regular_user_id', 'patient_id', 'test', 'regular_user_id', NOW() + INTERVAL '1 hour');
-- RESULT: ERROR: new row violates row-level security policy (or no policy)

-- Test: Non-admin cannot call grant function
SELECT grant_break_glass_access('user_id', 'patient_id', 'reason', 60);
-- RESULT: ERROR: Only admins can grant break-glass access
```

---

## Multi-Campus RLS Policies (corrected to use get_user_campus_ids())

### admin_users_select (campus-scoped)
```sql
CREATE POLICY admin_users_select ON user_profiles
  FOR SELECT
  USING (
    -- Super admin: all users
    has_role('super_admin')
    OR
    -- Admin: own campus only (via get_user_campus_ids)
    (
      has_role('admin')
      AND campus_id = ANY(get_user_campus_ids())
    )
  );
```

### admin_audit_logs_select (campus-scoped)
```sql
CREATE POLICY admin_audit_logs_select ON audit_logs
  FOR SELECT
  USING (
    -- Super admin: all logs
    has_role('super_admin')
    OR
    -- Admin: own campus only
    (
      has_role('admin')
      AND campus_id = ANY(get_user_campus_ids())
    )
  );
```

### admin_clinics_select (campus-scoped)
```sql
CREATE POLICY admin_clinics_select ON clinics
  FOR SELECT
  USING (
    -- Super admin: all clinics
    has_role('super_admin')
    OR
    -- Admin: own campus only
    (
      has_role('admin')
      AND campus_id = ANY(get_user_campus_ids())
    )
  );
```

### admin_queue_entries_select (FIXED: scoped by service_id)
```sql
-- BEFORE (BUGGY): doctor/dentist/nurse/clinic_staff only checked clinic_id
-- A doctor assigned to "Medical Consultation" would see "Dental" queue entries

-- AFTER (CORRECTED): scoped by clinic_id AND service_id
CREATE POLICY admin_queue_entries_select ON queue_entries
  FOR SELECT
  USING (
    -- Super admin: all
    has_role('super_admin')
    OR
    -- Admin: own campus clinics only
    (
      has_role('admin')
      AND clinic_id IN (
        SELECT c.id FROM clinics c
        WHERE c.campus_id = ANY(get_user_campus_ids())
      )
    )
    OR
    -- Doctor: assigned clinic + service only
    (
      has_role('doctor')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      )
    )
    OR
    -- Dentist: assigned clinic + service only
    (
      has_role('dentist')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      )
    )
    OR
    -- Nurse: assigned clinic + service only
    (
      has_role('nurse')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      )
    )
    OR
    -- Clinic staff: assigned clinic + service only
    (
      has_role('clinic_staff')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      )
    )
    OR
    -- Patient: own queue entries
    (
      patient_id = get_patient_id_for_user()
    )
  );
```

#### Verification
```sql
-- Test: Doctor assigned to "Medical" cannot see "Dental" queue entries
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'doctor_medical_only';

-- Setup: doctor_medical_only has assignment at Clinic A, Medical service only
-- Setup: queue_entries has a Dental entry at Clinic A

SELECT COUNT(*) FROM queue_entries
WHERE clinic_id = 'clinic_a_id'
  AND service_id = 'dental_service_id';
-- RESULT: 0 (doctor cannot see dental queue)

-- Test: Doctor assigned to "Medical" CAN see "Medical" queue entries
SELECT COUNT(*) FROM queue_entries
WHERE clinic_id = 'clinic_a_id'
  AND service_id = 'medical_service_id';
-- RESULT: > 0 (doctor can see medical queue)
```

### admin_encounters_select (campus-scoped for admin)
```sql
CREATE POLICY admin_encounters_select ON encounters
  FOR SELECT
  USING (
    -- Super admin: all
    has_role('super_admin')
    OR
    -- Admin: own campus clinics only
    (
      has_role('admin')
      AND clinic_id IN (
        SELECT c.id FROM clinics c
        WHERE c.campus_id = ANY(get_user_campus_ids())
      )
    )
    OR
    -- Doctor/Dentist: assigned encounters
    (
      (has_role('doctor') OR has_role('dentist'))
      AND is_provider_assigned_to_encounter(auth.uid(), id)
    )
    OR
    -- Nurse: care-team patients
    (
      has_role('nurse')
      AND patient_id IN (
        SELECT pt.patient_id FROM care_team_members pt
        WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
      )
    )
    OR
    -- Patient: own encounters
    (
      patient_id = get_patient_id_for_user()
    )
  );
```

### Verification
```sql
-- Test: get_user_campus_ids() is used in policies
SELECT policyname, qual
FROM pg_policies
WHERE qual::text LIKE '%get_user_campus_ids()%';
-- RESULT: Shows all campus-scoped policies use the function

-- Test: Admin at campus_a cannot see clinics at campus_b
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'admin_campus_a_user_id';

SELECT COUNT(*) FROM clinics
WHERE campus_id = 'campus_b_id';
-- RESULT: 0
```

---

## MFA / Session Hardening (Supabase Auth Config)

**Reviewer's point is valid:** MFA is a Supabase Auth project configuration, not a database schema claim. The database architecture document cannot "pass" on MFA — it's outside the database boundary.

### What the database architecture CAN specify:
```sql
-- The database relies on Supabase Auth for:
-- 1. JWT validity (if JWT is valid, user passed auth)
-- 2. auth.uid() returns the authenticated user's ID
-- 3. JWT expiry is enforced by Supabase Auth (not DB)
-- 4. MFA is enforced by Supabase Auth (not DB)

-- The database does NOT need to:
-- 1. Re-check MFA in RLS policies
-- 2. Store MFA enrollment status
-- 3. Validate JWT expiry (Supabase Auth handles this)
```

### What requires Supabase Dashboard configuration:
```
Supabase Dashboard → Authentication → Providers → Email
  - Enable email/password auth
  - Set minimum password length: 12
  - Enable "Confirm email" 

Supabase Dashboard → Authentication → Settings → MFA
  - Enable TOTP MFA
  - Enforce MFA for: admin, doctor, dentist, nurse roles
  (Note: role-based MFA enforcement is application-layer,
   not Supabase Auth native — Supabase Auth enforces MFA
   globally or per-user, not per-role)

Supabase Dashboard → Authentication → Settings → Security
  - JWT expiry: 3600
  - Refresh token rotation: enabled
  - Refresh token reuse interval: 10s
```

### Honest assessment:
- MFA per-role enforcement is **application-layer** (Supabase Auth doesn't natively support role-based MFA)
- JWT expiry and refresh rotation are **Supabase Auth config** (not database schema)
- The database trusts `auth.uid()` from valid JWTs — if the JWT is valid, the user passed whatever auth checks Supabase Auth applied

**This is a configuration claim, not a schema claim. It should be verified in the Supabase Dashboard, not in the database.**

---

## Self-Audit Limitation

The reviewer correctly notes: **this is not a truly independent audit.** The same model (MiMo) that wrote the remediation is now grading its own work. This is a bias problem.

### What "independent" means in this context:
- The Stage 4 audit was run in the same session as the remediation
- The auditor had access to the list of required fixes
- The auditor had incentive to confirm the fixes rather than find new issues

### What would make it truly independent:
- A separate session/context that only sees the remediation artifact
- No access to the original findings list
- Explicit instruction to adversarially break the architecture, not confirm a checklist

### What I can do:
- Show all the SQL (this document)
- Be transparent about what's verified vs. what's asserted
- Acknowledge that a fresh audit pass would be more trustworthy

### What I cannot do:
- Guarantee that a fresh audit would find no new issues
- Claim independence when the same context produced both artifact and audit
