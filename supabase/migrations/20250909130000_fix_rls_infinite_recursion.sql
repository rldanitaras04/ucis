-- Fix: Make helper functions SECURITY DEFINER to prevent infinite recursion
-- in RLS policies that query their own table.

-- get_user_profile_id queries user_profiles → triggers user_profiles RLS → calls get_user_campus_ids → queries user_profiles → infinite loop
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM user_profiles WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_provider_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM provider_profiles 
  WHERE user_profile_id = get_user_profile_id() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION get_patient_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM patient_profiles 
  WHERE user_profile_id = get_user_profile_id();
$$;

CREATE OR REPLACE FUNCTION get_user_clinic_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT pa.clinic_id 
    FROM provider_assignments pa
    WHERE pa.provider_profile_id = get_user_provider_profile_id()
      AND pa.is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION get_user_campus_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'super_admin'
    ) THEN
      ARRAY(SELECT id FROM campuses)
    ELSE
      ARRAY(
        SELECT DISTINCT campus_id
        FROM user_profiles
        WHERE auth_user_id = auth.uid()
        AND campus_id IS NOT NULL
      )
  END;
$$;
