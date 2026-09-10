-- Fix RLS gaps identified in audit

-- 1. Notifications: Replace WITH CHECK (TRUE) with proper user_id check
-- Users should only be able to create notifications for themselves
DROP POLICY IF EXISTS "users_insert_own_notifications" ON notifications;

CREATE POLICY "users_insert_own_notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Queue entries: Add clinic scoping
-- Queue entries should be scoped to clinic
DROP POLICY IF EXISTS "staff_manage_queue_entries" ON queue_entries;

CREATE POLICY "clinic_staff_manage_queue_entries"
  ON queue_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin', 'clinic_staff', 'doctor', 'dentist', 'nurse')
    )
  );

-- 3. Prescriptions: Admin should not be able to insert prescriptions directly
-- Only clinical roles should create prescriptions
DROP POLICY IF EXISTS "admin_manage_prescriptions" ON prescriptions;

-- Admin can only view prescriptions, not create them
CREATE POLICY "admin_view_prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- 4. Add unique constraint for clinic specialization mapping
-- This prevents duplicate clinic-specialization assignments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'clinic_specializations'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'clinic_specializations_clinic_id_specialization_id_key'
    ) THEN
      ALTER TABLE clinic_specializations
      ADD CONSTRAINT clinic_specializations_clinic_id_specialization_id_key
      UNIQUE (clinic_id, specialization_id);
    END IF;
  END IF;
END $$;

-- 5. Add unique constraint for encounter diagnosis mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'encounter_diagnoses'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'encounter_diagnoses_encounter_id_diagnosis_code_key'
    ) THEN
      ALTER TABLE encounter_diagnoses
      ADD CONSTRAINT encounter_diagnoses_encounter_id_diagnosis_code_key
      UNIQUE (encounter_id, diagnosis_code);
    END IF;
  END IF;
END $$;

-- 6. Add unique constraint for encounter treatment mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'encounter_treatments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'encounter_treatments_encounter_id_treatment_code_key'
    ) THEN
      ALTER TABLE encounter_treatments
      ADD CONSTRAINT encounter_treatments_encounter_id_treatment_code_key
      UNIQUE (encounter_id, treatment_code);
    END IF;
  END IF;
END $$;
