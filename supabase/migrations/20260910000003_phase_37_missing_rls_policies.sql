-- Phase 37: Fix missing RLS policies
-- Many tables only had SELECT policies, blocking all mutations
-- Uses DROP POLICY IF EXISTS to be idempotent

-- ============================================================
-- CLINICS: UPDATE and DELETE for admin/super_admin
-- ============================================================
DROP POLICY IF EXISTS clinics_update ON clinics;
CREATE POLICY clinics_update ON clinics
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND campus_id = ANY(get_user_campus_ids()))
  );

DROP POLICY IF EXISTS clinics_delete ON clinics;
CREATE POLICY clinics_delete ON clinics
  FOR DELETE TO authenticated
  USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND campus_id = ANY(get_user_campus_ids()))
  );

-- ============================================================
-- CLINIC_SERVICES: INSERT, UPDATE, DELETE for admin/super_admin
-- ============================================================
DROP POLICY IF EXISTS clinic_services_insert ON clinic_services;
CREATE POLICY clinic_services_insert ON clinic_services
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR
    (has_role('admin') AND clinic_id IN (
      SELECT c.id FROM clinics c WHERE c.campus_id = ANY(get_user_campus_ids())
    ))
  );

DROP POLICY IF EXISTS clinic_services_update ON clinic_services;
CREATE POLICY clinic_services_update ON clinic_services
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND clinic_id IN (
      SELECT c.id FROM clinics c WHERE c.campus_id = ANY(get_user_campus_ids())
    ))
  );

DROP POLICY IF EXISTS clinic_services_delete ON clinic_services;
CREATE POLICY clinic_services_delete ON clinic_services
  FOR DELETE TO authenticated
  USING (
    has_role('super_admin')
    OR
    (has_role('admin') AND clinic_id IN (
      SELECT c.id FROM clinics c WHERE c.campus_id = ANY(get_user_campus_ids())
    ))
  );

-- ============================================================
-- CAMPUSES: UPDATE and DELETE for super_admin
-- ============================================================
DROP POLICY IF EXISTS campuses_update ON campuses;
CREATE POLICY campuses_update ON campuses
  FOR UPDATE TO authenticated
  USING (has_role('super_admin'));

DROP POLICY IF EXISTS campuses_delete ON campuses;
CREATE POLICY campuses_delete ON campuses
  FOR DELETE TO authenticated
  USING (has_role('super_admin'));

-- ============================================================
-- UNIVERSITIES: UPDATE and DELETE for super_admin
-- ============================================================
DROP POLICY IF EXISTS universities_update ON universities;
CREATE POLICY universities_update ON universities
  FOR UPDATE TO authenticated
  USING (has_role('super_admin'));

DROP POLICY IF EXISTS universities_delete ON universities;
CREATE POLICY universities_delete ON universities
  FOR DELETE TO authenticated
  USING (has_role('super_admin'));

-- ============================================================
-- DOCUMENTS: INSERT, UPDATE for clinical/admin roles
-- ============================================================
DROP POLICY IF EXISTS documents_insert ON documents;
CREATE POLICY documents_insert ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('admin')
    OR has_role('doctor')
    OR has_role('dentist')
    OR has_role('nurse')
    OR has_role('clinic_staff')
  );

DROP POLICY IF EXISTS documents_update ON documents;
CREATE POLICY documents_update ON documents
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
    OR issued_by = auth.uid()
  );

-- ============================================================
-- CLEARANCES: INSERT, UPDATE for clinical/admin roles
-- ============================================================
DROP POLICY IF EXISTS clearances_insert ON clearances;
CREATE POLICY clearances_insert ON clearances
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('admin')
    OR has_role('doctor')
    OR has_role('dentist')
    OR has_role('nurse')
    OR has_role('clinic_staff')
  );

DROP POLICY IF EXISTS clearances_update ON clearances;
CREATE POLICY clearances_update ON clearances
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
    OR issued_by = auth.uid()
  );

-- ============================================================
-- FBS_RECORDS: INSERT, UPDATE for clinical roles
-- ============================================================
DROP POLICY IF EXISTS fbs_records_insert ON fbs_records;
CREATE POLICY fbs_records_insert ON fbs_records
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('admin')
    OR has_role('doctor')
    OR has_role('dentist')
    OR has_role('nurse')
  );

DROP POLICY IF EXISTS fbs_records_update ON fbs_records;
CREATE POLICY fbs_records_update ON fbs_records
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
    OR has_role('doctor')
    OR has_role('dentist')
    OR has_role('nurse')
  );

-- ============================================================
-- ROLES: INSERT, UPDATE, DELETE for super_admin
-- ============================================================
DROP POLICY IF EXISTS roles_insert ON roles;
CREATE POLICY roles_insert ON roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role('super_admin'));

DROP POLICY IF EXISTS roles_update ON roles;
CREATE POLICY roles_update ON roles
  FOR UPDATE TO authenticated
  USING (has_role('super_admin'));

DROP POLICY IF EXISTS roles_delete ON roles;
CREATE POLICY roles_delete ON roles
  FOR DELETE TO authenticated
  USING (has_role('super_admin'));

-- ============================================================
-- ROLE_PERMISSIONS: INSERT, DELETE for super_admin
-- ============================================================
DROP POLICY IF EXISTS role_permissions_insert ON role_permissions;
CREATE POLICY role_permissions_insert ON role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (has_role('super_admin'));

DROP POLICY IF EXISTS role_permissions_delete ON role_permissions;
CREATE POLICY role_permissions_delete ON role_permissions
  FOR DELETE TO authenticated
  USING (has_role('super_admin'));

-- ============================================================
-- PERMISSIONS: INSERT for super_admin
-- ============================================================
DROP POLICY IF EXISTS permissions_insert ON permissions;
CREATE POLICY permissions_insert ON permissions
  FOR INSERT TO authenticated
  WITH CHECK (has_role('super_admin'));

-- ============================================================
-- USER_ROLES: INSERT, UPDATE, DELETE for admin/super_admin
-- ============================================================
DROP POLICY IF EXISTS user_roles_insert ON user_roles;
CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('admin')
  );

DROP POLICY IF EXISTS user_roles_update ON user_roles;
CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
  );

DROP POLICY IF EXISTS user_roles_delete ON user_roles;
CREATE POLICY user_roles_delete ON user_roles
  FOR DELETE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
  );

-- ============================================================
-- PROVIDER_PROFILES: INSERT, UPDATE for admin/super_admin
-- ============================================================
DROP POLICY IF EXISTS provider_profiles_insert ON provider_profiles;
CREATE POLICY provider_profiles_insert ON provider_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('admin')
  );

DROP POLICY IF EXISTS provider_profiles_update ON provider_profiles;
CREATE POLICY provider_profiles_update ON provider_profiles
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
  );

-- ============================================================
-- PROVIDER_ASSIGNMENTS: INSERT, UPDATE, DELETE for admin/super_admin
-- ============================================================
DROP POLICY IF EXISTS provider_assignments_insert ON provider_assignments;
CREATE POLICY provider_assignments_insert ON provider_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('admin')
  );

DROP POLICY IF EXISTS provider_assignments_update ON provider_assignments;
CREATE POLICY provider_assignments_update ON provider_assignments
  FOR UPDATE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
  );

DROP POLICY IF EXISTS provider_assignments_delete ON provider_assignments;
CREATE POLICY provider_assignments_delete ON provider_assignments
  FOR DELETE TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
  );

-- ============================================================
-- NOTIFICATIONS: DELETE for owner or admin
-- ============================================================
DROP POLICY IF EXISTS notifications_delete ON notifications;
CREATE POLICY notifications_delete ON notifications
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role('super_admin')
    OR has_role('admin')
  );

-- ============================================================
-- BREAK_GLASS: INSERT for provider roles
-- ============================================================
DROP POLICY IF EXISTS break_glass_insert ON break_glass_access;
CREATE POLICY break_glass_insert ON break_glass_access
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('super_admin')
    OR has_role('doctor')
    OR has_role('dentist')
    OR has_role('nurse')
  );

-- ============================================================
-- PATIENT_PROFILES: Open SELECT for admin/clinical roles
-- ============================================================
DROP POLICY IF EXISTS patient_profiles_select ON patient_profiles;
CREATE POLICY patient_profiles_select ON patient_profiles
  FOR SELECT TO authenticated
  USING (
    has_role('super_admin')
    OR has_role('admin')
    OR has_role('clinic_staff')
    OR has_role('doctor')
    OR has_role('dentist')
    OR has_role('nurse')
    OR user_profile_id = get_user_profile_id()
  );

-- ============================================================
-- CLINICS & CLINIC_SERVICES: Open SELECT for all authenticated
-- ============================================================
DROP POLICY IF EXISTS clinics_select ON clinics;
CREATE POLICY clinics_select ON clinics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS clinic_services_select ON clinic_services;
CREATE POLICY clinic_services_select ON clinic_services FOR SELECT TO authenticated USING (true);

-- ============================================================
-- register_patient: SECURITY DEFINER RPC to bypass RLS on inserts
-- ============================================================
CREATE OR REPLACE FUNCTION register_patient(
  p_first_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE,
  p_gender TEXT,
  p_patient_type TEXT,
  p_middle_name TEXT DEFAULT NULL,
  p_suffix TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_contact_number TEXT DEFAULT NULL,
  p_blood_type TEXT DEFAULT NULL,
  p_allergies TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_university_id TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO patient_profiles (
    first_name, middle_name, last_name, suffix,
    date_of_birth, gender, patient_type,
    email, contact_number, blood_type, allergies,
    emergency_contact_name, emergency_contact_phone,
    university_id, address, status
  ) VALUES (
    p_first_name, p_middle_name, p_last_name, p_suffix,
    p_date_of_birth, p_gender, p_patient_type,
    p_email, p_contact_number, p_blood_type, p_allergies,
    p_emergency_contact_name, p_emergency_contact_phone,
    p_university_id, p_address, 'active'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
