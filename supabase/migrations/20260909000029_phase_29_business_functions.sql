-- UCIS Migration: Phase 29 - Business Functions
-- Dependencies: Phase 28 (authorization functions)

-- ============================================================
-- WRITE AUDIT LOG
-- ============================================================

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

-- ============================================================
-- LOG PHI READ (for read-audit on sensitive tables)
-- ============================================================

CREATE OR REPLACE FUNCTION log_phi_read(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_correlation_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    actor, action, resource_type, resource_id,
    correlation_id, outcome
  ) VALUES (
    auth.uid(), 'READ', p_resource_type, p_resource_id,
    p_correlation_id, 'success'
  );
END;
$$;

-- ============================================================
-- VERIFY PUBLIC DOCUMENT (QR verification)
-- ============================================================

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
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::TEXT, NULL::TIMESTAMPTZ;
  ELSE
    RETURN QUERY SELECT v_is_valid, v_doc_type, v_issued_at;
  END IF;
END;
$$;

-- ============================================================
-- GENERATE DOCUMENT CONTROL NUMBER
-- ============================================================

CREATE OR REPLACE FUNCTION generate_document_control_number(
  p_campus_id UUID,
  p_document_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number INTEGER;
  v_control_number TEXT;
BEGIN
  -- Atomically increment the sequence
  INSERT INTO document_sequences (campus_id, document_type, last_number)
  VALUES (p_campus_id, p_document_type, 1)
  ON CONFLICT (campus_id, document_type) DO UPDATE
  SET last_number = document_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;

  -- Format: TYPE-CAMPUS-NUMBER (e.g., MC-MAIN-000001)
  v_control_number := p_document_type || '-' || 
    (SELECT abbreviation FROM campuses WHERE id = p_campus_id) || '-' ||
    LPAD(v_next_number::TEXT, 6, '0');

  RETURN v_control_number;
END;
$$;

-- ============================================================
-- CREATE QUEUE ENTRY (atomic queue generation)
-- ============================================================

CREATE OR REPLACE FUNCTION create_queue_entry(
  p_clinic_id UUID,
  p_service_id UUID,
  p_patient_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number INTEGER;
  v_queue_date DATE := CURRENT_DATE;
BEGIN
  -- Atomically increment queue counter
  INSERT INTO queue_counters (clinic_id, service_id, queue_date, last_number)
  VALUES (p_clinic_id, p_service_id, v_queue_date, 1)
  ON CONFLICT (clinic_id, service_id, queue_date) DO UPDATE
  SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_next_number;

  -- Insert queue entry
  INSERT INTO queue_entries (
    queue_number, clinic_id, service_id, patient_id, queue_date, status
  ) VALUES (
    v_next_number, p_clinic_id, p_service_id, p_patient_id, v_queue_date, 'waiting'
  );

  RETURN v_next_number;
END;
$$;

-- ============================================================
-- DISPENSE PRESCRIPTION (transactional dispensing)
-- ============================================================

CREATE OR REPLACE FUNCTION dispense_prescription(
  p_prescription_item_id UUID,
  p_medicine_batch_id UUID,
  p_quantity INTEGER,
  p_dispensed_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispensing_id UUID;
  v_available_quantity INTEGER;
BEGIN
  -- Lock the batch row for update (prevents concurrent dispensing)
  SELECT quantity INTO v_available_quantity
  FROM medicine_batches
  WHERE id = p_medicine_batch_id
  FOR UPDATE;

  -- Validate quantity
  IF v_available_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', 
      v_available_quantity, p_quantity;
  END IF;

  -- Validate prescription item exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM prescription_items pi
    JOIN prescriptions pr ON pr.id = pi.prescription_id
    WHERE pi.id = p_prescription_item_id
      AND pr.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Prescription item not found or prescription not active';
  END IF;

  -- Deduct stock
  UPDATE medicine_batches
  SET quantity = quantity - p_quantity
  WHERE id = p_medicine_batch_id;

  -- Create dispensing record
  INSERT INTO dispensing_records (
    prescription_item_id, medicine_batch_id, quantity_dispensed, dispensed_by
  ) VALUES (
    p_prescription_item_id, p_medicine_batch_id, p_quantity, p_dispensed_by
  ) RETURNING id INTO v_dispensing_id;

  -- Create inventory transaction
  INSERT INTO inventory_transactions (
    medicine_batch_id, transaction_type, quantity_change, reference_id, created_by
  ) VALUES (
    p_medicine_batch_id, 'dispensing', -p_quantity, v_dispensing_id, p_dispensed_by
  );

  -- Check if prescription is fully dispensed
  UPDATE prescriptions
  SET status = 'dispensed', updated_at = NOW()
  WHERE id = (
    SELECT pr.id FROM prescription_items pi
    JOIN prescriptions pr ON pr.id = pi.prescription_id
    WHERE pi.id = p_prescription_item_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM prescription_items pi2
    WHERE pi2.prescription_id = (
      SELECT pr2.id FROM prescription_items pi3
      JOIN prescriptions pr2 ON pr2.id = pi3.prescription_id
      WHERE pi3.id = p_prescription_item_id
    )
    AND pi2.id != p_prescription_item_id
  );

  RETURN v_dispensing_id;
END;
$$;

-- ============================================================
-- BREAK-GLASS FUNCTIONS
-- ============================================================

-- Grant break-glass access (admin-only, with safeguards)
CREATE OR REPLACE FUNCTION grant_break_glass_access(
  p_user_id UUID,
  p_patient_id UUID,
  p_reason break_glass_reason,
  p_encounter_id UUID DEFAULT NULL,
  p_duration_minutes INT DEFAULT 240
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
  -- SAFEGUARD 1: Caller must be admin or super_admin
  IF NOT (has_role('admin') OR has_role('super_admin')) THEN
    RAISE EXCEPTION 'Only admins can grant break-glass access';
  END IF;

  -- SAFEGUARD 2: Cannot self-grant
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Admins cannot grant break-glass access to themselves';
  END IF;

  -- SAFEGUARD 3: Recipient must hold a clinical role
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

  -- SAFEGUARD 4: Duration limit
  IF p_duration_minutes > 240 THEN
    RAISE EXCEPTION 'Break-glass duration cannot exceed 4 hours';
  END IF;

  -- SAFEGUARD 5: No duplicate active grants
  IF EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = p_user_id
      AND patient_id = p_patient_id
      AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Active break-glass grant already exists for this user/patient';
  END IF;

  -- SAFEGUARD 6: If encounter_id provided, validate it exists
  IF p_encounter_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM encounters WHERE id = p_encounter_id) THEN
      RAISE EXCEPTION 'Encounter % does not exist', p_encounter_id;
    END IF;
  END IF;

  -- CREATE THE GRANT
  v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO break_glass_access (
    user_id, patient_id, reason, granted_by,
    granted_at, expires_at, audit_trail
  ) VALUES (
    p_user_id, p_patient_id, p_reason, v_caller_id,
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

  -- AUDIT
  PERFORM write_audit_log(
    'BREAK_GLASS_GRANTED', 'break_glass_access', v_grant_id, NULL,
    format('Admin %s granted break-glass to %s for patient %s', v_caller_id, p_user_id, p_patient_id)
  );

  -- REAL-TIME NOTIFICATION
  INSERT INTO notifications (user_id, title, body, notification_type, metadata)
  SELECT ur.user_id, 'BREAK-GLASS ALERT',
    format('Admin granted break-glass to %s for patient %s', v_recipient_name, p_patient_id),
    'security_alert',
    jsonb_build_object('grant_id', v_grant_id, 'action', 'break_glass_granted')
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'super_admin' AND ur.is_active = TRUE AND ur.user_id != v_caller_id;

  RETURN v_grant_id;
END;
$$;

-- Revoke break-glass access
CREATE OR REPLACE FUNCTION revoke_break_glass_access(p_grant_id UUID)
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

  UPDATE break_glass_access SET expires_at = NOW()
  WHERE id = p_grant_id AND expires_at > NOW();

  PERFORM write_audit_log('BREAK_GLASS_REVOKED', 'break_glass_access', p_grant_id, NULL,
    format('Admin %s revoked break-glass access', v_caller_id));
END;
$$;

-- Get patient summary for break-glass
CREATE OR REPLACE FUNCTION get_patient_summary_for_break_glass(p_patient_id UUID)
RETURNS TABLE (
  patient_id UUID, full_name TEXT, date_of_birth DATE,
  blood_type TEXT, allergies TEXT,
  emergency_contact TEXT, emergency_contact_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = v_caller_id AND patient_id = p_patient_id AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'No active break-glass access for this patient';
  END IF;

  PERFORM write_audit_log('BREAK_GLASS_READ', 'patient', p_patient_id, NULL, 'Emergency break-glass access');

  RETURN QUERY
  SELECT pp.id, pp.first_name || ' ' || pp.last_name, pp.date_of_birth,
    pp.blood_type, pp.allergies, pp.emergency_contact_name, pp.emergency_contact_phone
  FROM patient_profiles pp WHERE pp.id = p_patient_id;
END;
$$;

-- Get encounter records for break-glass
CREATE OR REPLACE FUNCTION get_encounter_records_for_break_glass(
  p_patient_id UUID, p_record_type TEXT
)
RETURNS TABLE (
  encounter_id UUID, encounter_date TIMESTAMPTZ,
  chief_complaint TEXT, diagnosis TEXT,
  treatment_plan TEXT, provider_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = v_caller_id AND patient_id = p_patient_id AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'No active break-glass access for this patient';
  END IF;

  PERFORM write_audit_log('BREAK_GLASS_READ', 'encounter', p_patient_id, NULL,
    'Emergency break-glass access for ' || p_record_type || ' records');

  IF p_record_type = 'medical' THEN
    RETURN QUERY
    SELECT e.id, e.visit_date, mr.chief_complaint, mr.diagnosis, mr.treatment_plan,
      up.first_name || ' ' || up.last_name
    FROM encounters e
    JOIN medical_records mr ON mr.encounter_id = e.id
    JOIN provider_profiles pp ON pp.id = mr.created_by
    JOIN user_profiles up ON up.id = pp.user_profile_id
    WHERE e.patient_id = p_patient_id
    ORDER BY e.visit_date DESC LIMIT 10;
  ELSIF p_record_type = 'dental' THEN
    RETURN QUERY
    SELECT e.id, e.visit_date, dr.chief_complaint, dr.diagnosis, dr.treatment_plan,
      up.first_name || ' ' || up.last_name
    FROM encounters e
    JOIN dental_records dr ON dr.encounter_id = e.id
    JOIN provider_profiles pp ON pp.id = dr.created_by
    JOIN user_profiles up ON up.id = pp.user_profile_id
    WHERE e.patient_id = p_patient_id
    ORDER BY e.visit_date DESC LIMIT 10;
  ELSE
    RAISE EXCEPTION 'Invalid record_type: %. Must be medical or dental.', p_record_type;
  END IF;
END;
$$;

-- Get prescriptions for break-glass
CREATE OR REPLACE FUNCTION get_prescriptions_for_break_glass(p_patient_id UUID)
RETURNS TABLE (
  prescription_id UUID, prescribed_date TIMESTAMPTZ,
  medication_name TEXT, dosage TEXT, frequency TEXT,
  duration TEXT, provider_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM break_glass_access
    WHERE user_id = v_caller_id AND patient_id = p_patient_id AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'No active break-glass access for this patient';
  END IF;

  PERFORM write_audit_log('BREAK_GLASS_READ', 'prescription', p_patient_id, NULL,
    'Emergency break-glass access for prescriptions');

  RETURN QUERY
  SELECT pr.id, pr.prescribed_date, pi.medication_name, pi.dosage, pi.frequency,
    pi.duration, up.first_name || ' ' || up.last_name
  FROM prescriptions pr
  JOIN prescription_items pi ON pi.prescription_id = pr.id
  JOIN encounters e ON e.id = pr.encounter_id
  JOIN provider_profiles pp ON pp.id = pr.created_by
  JOIN user_profiles up ON up.id = pp.user_profile_id
  WHERE e.patient_id = p_patient_id
  ORDER BY pr.prescribed_date DESC LIMIT 20;
END;
$$;

-- ============================================================
-- REVOKE EXECUTE FROM PUBLIC, GRANT TO AUTHENTICATED/SERVICE_ROLE
-- ============================================================

REVOKE EXECUTE ON FUNCTION write_audit_log FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION log_phi_read FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION verify_public_document FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_document_control_number FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_queue_entry FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION dispense_prescription FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION grant_break_glass_access FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION revoke_break_glass_access FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_patient_summary_for_break_glass FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_encounter_records_for_break_glass FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_prescriptions_for_break_glass FROM PUBLIC;

GRANT EXECUTE ON FUNCTION write_audit_log TO service_role;
GRANT EXECUTE ON FUNCTION log_phi_read TO service_role;
GRANT EXECUTE ON FUNCTION verify_public_document TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_document_control_number TO authenticated;
GRANT EXECUTE ON FUNCTION create_queue_entry TO authenticated;
GRANT EXECUTE ON FUNCTION dispense_prescription TO authenticated;
GRANT EXECUTE ON FUNCTION grant_break_glass_access TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_break_glass_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_summary_for_break_glass TO authenticated;
GRANT EXECUTE ON FUNCTION get_encounter_records_for_break_glass TO authenticated;
GRANT EXECUTE ON FUNCTION get_prescriptions_for_break_glass TO authenticated;
