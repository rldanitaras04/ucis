-- UCIS Migration: Phase 32 - RLS Policies
-- Dependencies: Phase 28 (authorization functions), Phase 31 (RLS enabled)

-- ============================================================
-- USER PROFILES
-- ============================================================

CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT USING (
    -- Own profile
    auth_user_id = auth.uid()
    OR
    -- Super admin: all
    has_role('super_admin')
    OR
    -- Admin: own campus
    (has_role('admin') AND campus_id = ANY(get_user_campus_ids()))
    OR
    -- Doctor/Dentist: assigned patients
    ((has_role('doctor') OR has_role('dentist'))
      AND id IN (SELECT up.id FROM user_profiles up
        JOIN patient_profiles pp ON pp.user_profile_id = up.id
        WHERE is_provider_assigned_to_patient(auth.uid(), pp.id)))
    OR
    -- Nurse: clinic scope
    (has_role('nurse')
      AND campus_id = ANY(get_user_campus_ids()))
    OR
    -- Clinic staff: clinic scope
    (has_role('clinic_staff')
      AND campus_id = ANY(get_user_campus_ids()))
  );

CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE USING (
    -- Own profile (limited fields)
    auth_user_id = auth.uid()
    OR
    -- Admin: own campus
    (has_role('admin') AND campus_id = ANY(get_user_campus_ids()))
    OR
    -- Super admin: all
    has_role('super_admin')
  );

-- ============================================================
-- PATIENT PROFILES
-- ============================================================

CREATE POLICY patient_profiles_select ON patient_profiles
  FOR SELECT USING (
    -- Own profile
    user_profile_id = get_user_profile_id()
    OR
    -- Doctor/Dentist: assigned encounter patients
    id IN (
      SELECT e.patient_id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
    OR
    -- Nurse: care-team patients
    id IN (
      SELECT pt.patient_id FROM care_team_members pt
      WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
    )
    OR
    -- Clinic staff: clinic patients (demographics only)
    clinic_id IN (
      SELECT pa.clinic_id FROM provider_assignments pa
      WHERE pa.provider_profile_id = get_user_provider_profile_id()
        AND pa.is_active = TRUE
    )
  );

CREATE POLICY patient_profiles_update ON patient_profiles
  FOR UPDATE USING (
    user_profile_id = get_user_profile_id()
  );

-- ============================================================
-- ENCOUNTERS
-- ============================================================

CREATE POLICY encounters_select ON encounters
  FOR SELECT USING (
    -- Patient: own encounters
    patient_id = get_patient_id_for_user()
    OR
    -- Doctor/Dentist: assigned encounters
    ((has_role('doctor') OR has_role('dentist'))
      AND is_provider_assigned_to_encounter(auth.uid(), id))
    OR
    -- Nurse: care-team patients
    (has_role('nurse')
      AND patient_id IN (
        SELECT pt.patient_id FROM care_team_members pt
        WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
      ))
    OR
    -- Clinic staff: clinic scope
    (has_role('clinic_staff')
      AND clinic_id IN (
        SELECT pa.clinic_id FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
      ))
    OR
    -- Admin: own campus clinics
    (has_role('admin')
      AND clinic_id IN (
        SELECT c.id FROM clinics c
        WHERE c.campus_id = ANY(get_user_campus_ids())
      ))
  );

CREATE POLICY encounters_insert ON encounters
  FOR INSERT WITH CHECK (
    (has_role('doctor') OR has_role('dentist'))
    AND is_provider_assigned_to_encounter(auth.uid(), id)
  );

CREATE POLICY encounters_update ON encounters
  FOR UPDATE USING (
    (has_role('doctor') OR has_role('dentist'))
    AND is_provider_assigned_to_encounter(auth.uid(), id)
  );

-- ============================================================
-- MEDICAL RECORDS
-- ============================================================

CREATE POLICY medical_records_select ON medical_records
  FOR SELECT USING (
    -- Patient: own records
    patient_id = get_patient_id_for_user()
    OR
    -- Doctor: assigned encounters only
    (has_role('doctor')
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
      ))
    OR
    -- Nurse: care-team patients
    (has_role('nurse')
      AND patient_id IN (
        SELECT pt.patient_id FROM care_team_members pt
        WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
      ))
  );

CREATE POLICY medical_records_insert ON medical_records
  FOR INSERT WITH CHECK (
    has_role('doctor')
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
    AND created_by = get_user_provider_profile_id()
  );

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
    has_role('doctor')
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
  );

-- ============================================================
-- DENTAL RECORDS
-- ============================================================

CREATE POLICY dental_records_select ON dental_records
  FOR SELECT USING (
    -- Patient: own records
    patient_id = get_patient_id_for_user()
    OR
    -- Dentist: assigned encounters only
    (has_role('dentist')
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
      ))
    OR
    -- Nurse: care-team patients
    (has_role('nurse')
      AND patient_id IN (
        SELECT pt.patient_id FROM care_team_members pt
        WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
      ))
  );

CREATE POLICY dental_records_insert ON dental_records
  FOR INSERT WITH CHECK (
    has_role('dentist')
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
    AND created_by = get_user_provider_profile_id()
  );

CREATE POLICY dental_records_update ON dental_records
  FOR UPDATE
  USING (
    has_role('dentist')
    AND status = 'draft'
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
  )
  WITH CHECK (
    has_role('dentist')
    AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
    )
  );

-- ============================================================
-- FBS RECORDS
-- ============================================================

CREATE POLICY fbs_records_select ON fbs_records
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR
    (has_role('doctor')
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
      ))
    OR
    (has_role('nurse')
      AND patient_id IN (
        SELECT pt.patient_id FROM care_team_members pt
        WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
      ))
  );

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================

CREATE POLICY prescriptions_select ON prescriptions
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR
    (has_role('doctor')
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
      ))
    OR
    (has_role('nurse')
      AND patient_id IN (
        SELECT pt.patient_id FROM care_team_members pt
        WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE
      ))
    OR
    (has_role('clinic_staff')
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE e.clinic_id IN (
          SELECT pa.clinic_id FROM provider_assignments pa
          WHERE pa.provider_profile_id = get_user_provider_profile_id()
            AND pa.is_active = TRUE
        )
      ))
  );

-- ============================================================
-- QUEUE ENTRIES
-- ============================================================

CREATE POLICY queue_entries_select ON queue_entries
  FOR SELECT USING (
    -- Patient: own queue
    patient_id = get_patient_id_for_user()
    OR
    -- Doctor: assigned clinic + service
    (has_role('doctor')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      ))
    OR
    -- Dentist: assigned clinic + service
    (has_role('dentist')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      ))
    OR
    -- Nurse: assigned clinic + service
    (has_role('nurse')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      ))
    OR
    -- Clinic staff: assigned clinic + service
    (has_role('clinic_staff')
      AND EXISTS (
        SELECT 1 FROM provider_assignments pa
        WHERE pa.provider_profile_id = get_user_provider_profile_id()
          AND pa.is_active = TRUE
          AND pa.clinic_id = queue_entries.clinic_id
          AND pa.service_id = queue_entries.service_id
      ))
    OR
    -- Admin: own campus clinics
    (has_role('admin')
      AND clinic_id IN (
        SELECT c.id FROM clinics c
        WHERE c.campus_id = ANY(get_user_campus_ids())
      ))
  );

CREATE POLICY queue_entries_insert ON queue_entries
  FOR INSERT WITH CHECK (
    (has_role('clinic_staff') OR has_role('nurse'))
    AND clinic_id IN (
      SELECT pa.clinic_id FROM provider_assignments pa
      WHERE pa.provider_profile_id = get_user_provider_profile_id()
        AND pa.is_active = TRUE
    )
  );

CREATE POLICY queue_entries_update ON queue_entries
  FOR UPDATE USING (
    (has_role('clinic_staff') OR has_role('nurse'))
    AND clinic_id IN (
      SELECT pa.clinic_id FROM provider_assignments pa
      WHERE pa.provider_profile_id = get_user_provider_profile_id()
        AND pa.is_active = TRUE
    )
  );

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE POLICY documents_select ON documents
  FOR SELECT USING (
    -- Patient: own documents
    patient_id = get_patient_id_for_user()
    OR
    -- Doctor/Dentist: assigned encounter documents
    ((has_role('doctor') OR has_role('dentist'))
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
      ))
    OR
    -- Clinic staff: clinic documents
    (has_role('clinic_staff')
      AND issued_by IN (
        SELECT up.auth_user_id FROM user_profiles up
        JOIN provider_profiles pp ON pp.user_profile_id = up.id
        WHERE pp.id IN (
          SELECT pa.provider_profile_id FROM provider_assignments pa
          WHERE pa.provider_profile_id = get_user_provider_profile_id()
            AND pa.is_active = TRUE
        )
      ))
    OR
    -- Admin: own campus
    (has_role('admin')
      AND patient_id IN (
        SELECT pp.id FROM patient_profiles pp
        WHERE pp.campus_id = ANY(get_user_campus_ids())
      ))
  );

-- ============================================================
-- CLEARANCES
-- ============================================================

CREATE POLICY clearances_select ON clearances
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR
    ((has_role('doctor') OR has_role('dentist'))
      AND encounter_id IN (
        SELECT e.id FROM encounters e
        WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)
      ))
  );

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (
    has_role('super_admin')
    OR
    (has_role('admin')
      AND actor IN (
        SELECT up.auth_user_id FROM user_profiles up
        WHERE up.campus_id = ANY(get_user_campus_ids())
      ))
  );

-- No INSERT policy: only SECURITY DEFINER functions can insert
-- No UPDATE/DELETE policies: append-only triggers handle this

-- ============================================================
-- LOGIN HISTORY
-- ============================================================

CREATE POLICY login_history_select ON login_history
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    has_role('super_admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (
    TRUE  -- SECURITY DEFINER functions handle authorization
  );

CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- ============================================================
-- DOCUMENT VERIFICATION LOGS
-- ============================================================

-- Deny all direct access (verify_public_document() handles this)
CREATE POLICY document_verification_logs_deny_all ON document_verification_logs
  FOR ALL USING (FALSE);

-- ============================================================
-- BREAK-GLASS ACCESS
-- ============================================================

-- No direct INSERT/UPDATE policies: grant_break_glass_access() handles this
-- SELECT: only admins and the granted user can see records
CREATE POLICY break_glass_select ON break_glass_access
  FOR SELECT USING (
    has_role('super_admin')
    OR
    has_role('admin')
    OR
    user_id = auth.uid()
  );

-- ============================================================
-- CLINICS, CAMPUSES, UNIVERSITIES
-- ============================================================

CREATE POLICY clinics_select ON clinics
  FOR SELECT USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND campus_id = ANY(get_user_campus_ids()))
    OR
    (has_role('doctor') OR has_role('dentist') OR has_role('nurse') OR has_role('clinic_staff')
      AND id IN (SELECT unnest(get_user_clinic_ids())))
  );

CREATE POLICY campuses_select ON campuses
  FOR SELECT USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND id = ANY(get_user_campus_ids()))
  );

CREATE POLICY universities_select ON universities
  FOR SELECT USING (
    has_role('super_admin')
    OR
    (has_role('admin'))
  );

-- ============================================================
-- ROLES, PERMISSIONS (read-only for all authenticated)
-- ============================================================

CREATE POLICY roles_select ON roles FOR SELECT USING (TRUE);
CREATE POLICY permissions_select ON permissions FOR SELECT USING (TRUE);
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT USING (TRUE);

-- ============================================================
-- USER ROLES
-- ============================================================

CREATE POLICY user_roles_select ON user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    has_role('super_admin')
    OR
    (has_role('admin')
      AND user_id IN (
        SELECT up.auth_user_id FROM user_profiles up
        WHERE up.campus_id = ANY(get_user_campus_ids())
      ))
  );

-- ============================================================
-- PROVIDER PROFILES
-- ============================================================

CREATE POLICY provider_profiles_select ON provider_profiles
  FOR SELECT USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND user_profile_id IN (
      SELECT up.id FROM user_profiles up
      WHERE up.campus_id = ANY(get_user_campus_ids())
    ))
    OR
    user_profile_id = get_user_profile_id()
  );

-- ============================================================
-- PROVIDER ASSIGNMENTS
-- ============================================================

CREATE POLICY provider_assignments_select ON provider_assignments
  FOR SELECT USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND clinic_id IN (
      SELECT c.id FROM clinics c
      WHERE c.campus_id = ANY(get_user_campus_ids())
    ))
    OR
    provider_profile_id = get_user_provider_profile_id()
  );
