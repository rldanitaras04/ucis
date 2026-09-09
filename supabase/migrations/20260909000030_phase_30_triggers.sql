-- UCIS Migration: Phase 30 - Triggers (FIXED)
-- Dependencies: Phase 14-25 (all clinical and system tables)

-- ============================================================
-- PREVENT DELETE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Physical DELETE is not permitted on this table';
END;
$$;

-- ============================================================
-- PREVENT UPDATE FUNCTION (for append-only tables)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE is not permitted on this table';
END;
$$;

-- ============================================================
-- PREVENT FINALIZED UPDATE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_finalized_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    RAISE EXCEPTION 'Cannot modify a finalized record';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PREVENT MEDICAL RECORD FIELD CHANGE
-- ============================================================

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

-- ============================================================
-- PREVENT DENTAL RECORD FIELD CHANGE
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_dental_record_field_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.encounter_id != OLD.encounter_id THEN
    RAISE EXCEPTION 'Cannot change encounter_id on dental record';
  END IF;
  IF NEW.patient_id != OLD.patient_id THEN
    RAISE EXCEPTION 'Cannot change patient_id on dental record';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- VALIDATE PATIENT USER CONSISTENCY
-- ============================================================

CREATE OR REPLACE FUNCTION validate_patient_user_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = NEW.user_profile_id
        AND up.user_type NOT IN ('student', 'faculty', 'non_teaching_staff')
    ) THEN
      RAISE EXCEPTION 'Patient user_type must be student, faculty, or non_teaching_staff';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STATUS TRANSITION FUNCTIONS (one per record type)
-- ============================================================

-- Medical Records
CREATE OR REPLACE FUNCTION validate_medical_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
    RETURN NEW;
  ELSIF OLD.status = 'finalized' AND NEW.status = 'amended' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for medical record', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Dental Records
CREATE OR REPLACE FUNCTION validate_dental_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
    RETURN NEW;
  ELSIF OLD.status = 'finalized' AND NEW.status = 'amended' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for dental record', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Encounters
CREATE OR REPLACE FUNCTION validate_encounter_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status IN ('in_progress', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for encounter', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Queue Entries
CREATE OR REPLACE FUNCTION validate_queue_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'waiting' AND NEW.status IN ('called', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'called' AND NEW.status = 'in_service' THEN
    RETURN NEW;
  ELSIF OLD.status = 'in_service' AND NEW.status = 'completed' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for queue entry', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Prescriptions
CREATE OR REPLACE FUNCTION validate_prescription_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('dispensed', 'cancelled', 'expired') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for prescription', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Clearances
CREATE OR REPLACE FUNCTION validate_clearance_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('revoked', 'expired') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for clearance', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Documents
CREATE OR REPLACE FUNCTION validate_document_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('revoked', 'expired') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for document', OLD.status, NEW.status;
  END IF;
END;
$$;

-- Incidents
CREATE OR REPLACE FUNCTION validate_incident_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status IN ('investigating', 'closed') THEN
    RETURN NEW;
  ELSIF OLD.status = 'investigating' AND NEW.status = 'resolved' THEN
    RETURN NEW;
  ELSIF OLD.status = 'resolved' AND NEW.status = 'closed' THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to % for incident', OLD.status, NEW.status;
  END IF;
END;
$$;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

-- Medical Records
CREATE TRIGGER trg_medical_record_immutable
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION prevent_finalized_update();

CREATE TRIGGER trg_medical_record_status_transition
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION validate_medical_status_transition();

CREATE TRIGGER trg_medical_record_field_immutable
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION prevent_medical_record_field_change();

CREATE TRIGGER trg_medical_record_no_delete
  BEFORE DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Dental Records
CREATE TRIGGER trg_dental_record_immutable
  BEFORE UPDATE ON dental_records
  FOR EACH ROW EXECUTE FUNCTION prevent_finalized_update();

CREATE TRIGGER trg_dental_record_status_transition
  BEFORE UPDATE ON dental_records
  FOR EACH ROW EXECUTE FUNCTION validate_dental_status_transition();

CREATE TRIGGER trg_dental_record_field_immutable
  BEFORE UPDATE ON dental_records
  FOR EACH ROW EXECUTE FUNCTION prevent_dental_record_field_change();

CREATE TRIGGER trg_dental_record_no_delete
  BEFORE DELETE ON dental_records
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Other Clinical Tables
CREATE TRIGGER trg_fbs_no_delete
  BEFORE DELETE ON fbs_records
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_odontogram_immutable
  BEFORE UPDATE ON odontogram_records
  FOR EACH ROW EXECUTE FUNCTION prevent_update();

CREATE TRIGGER trg_odontogram_no_delete
  BEFORE DELETE ON odontogram_records
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_prescriptions_no_delete
  BEFORE DELETE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_dispensing_no_delete
  BEFORE DELETE ON dispensing_records
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_inventory_no_delete
  BEFORE DELETE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Organizational Tables
CREATE TRIGGER trg_patient_no_delete
  BEFORE DELETE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_provider_no_delete
  BEFORE DELETE ON provider_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_assignment_no_delete
  BEFORE DELETE ON provider_assignments
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_encounters_no_delete
  BEFORE DELETE ON encounters
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_encounters_status_transition
  BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION validate_encounter_status_transition();

-- Document Tables
CREATE TRIGGER trg_documents_no_delete
  BEFORE DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_clearances_no_delete
  BEFORE DELETE ON clearances
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_referrals_no_delete
  BEFORE DELETE ON clinical_referrals
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_consent_no_delete
  BEFORE DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Security Tables
CREATE TRIGGER trg_break_glass_no_delete
  BEFORE DELETE ON break_glass_access
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_update();

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER trg_login_no_update
  BEFORE UPDATE ON login_history
  FOR EACH ROW EXECUTE FUNCTION prevent_update();

CREATE TRIGGER trg_login_no_delete
  BEFORE DELETE ON login_history
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- Queue Status Transition
CREATE TRIGGER trg_queue_status_transition
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION validate_queue_status_transition();

-- Prescription Status Transition
CREATE TRIGGER trg_prescription_status_transition
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION validate_prescription_status_transition();

-- Clearance Status Transition
CREATE TRIGGER trg_clearance_status_transition
  BEFORE UPDATE ON clearances
  FOR EACH ROW EXECUTE FUNCTION validate_clearance_status_transition();

-- Document Status Transition
CREATE TRIGGER trg_document_status_transition
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION validate_document_status_transition();

-- Incident Status Transition
CREATE TRIGGER trg_incident_status_transition
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION validate_incident_status_transition();

-- Patient User Consistency
CREATE TRIGGER trg_patient_user_consistency
  BEFORE INSERT OR UPDATE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION validate_patient_user_consistency();
