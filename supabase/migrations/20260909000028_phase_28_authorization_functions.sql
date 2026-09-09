-- UCIS Migration: Phase 28 - Authorization Functions
-- Dependencies: Phase 03-09 (all core tables)

-- ============================================================
-- HELPER FUNCTIONS (non-SECURITY DEFINER, use auth.uid())
-- ============================================================

-- Get current user's profile ID
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM user_profiles WHERE auth_user_id = auth.uid();
$$;

-- Get current user's provider profile ID (NULL if not a provider)
CREATE OR REPLACE FUNCTION get_user_provider_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM provider_profiles 
  WHERE user_profile_id = get_user_profile_id() AND is_active = TRUE;
$$;

-- Get current user's patient profile ID (NULL if not a patient)
CREATE OR REPLACE FUNCTION get_patient_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM patient_profiles 
  WHERE user_profile_id = get_user_profile_id();
$$;

-- Get clinic IDs for current user
CREATE OR REPLACE FUNCTION get_user_clinic_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
AS $$
  SELECT ARRAY(
    SELECT DISTINCT pa.clinic_id 
    FROM provider_assignments pa
    WHERE pa.provider_profile_id = get_user_provider_profile_id()
      AND pa.is_active = TRUE
  );
$$;

-- Get campus IDs for current user
CREATE OR REPLACE FUNCTION get_user_campus_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
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

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (authorization checks)
-- ============================================================

-- Check if user has a specific role (DB-backed, not JWT-backed)
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

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(required_permission TEXT)
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
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.name = required_permission
      AND ur.is_active = TRUE
      AND r.is_active = TRUE
  );
$$;

-- Check if provider is assigned to a specific encounter
CREATE OR REPLACE FUNCTION is_provider_assigned_to_encounter(
  p_user_id UUID,
  p_encounter_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
  v_encounter_clinic_id UUID;
  v_encounter_service_id UUID;
BEGIN
  -- Get provider profile for the user
  SELECT pp.id INTO v_provider_id
  FROM provider_profiles pp
  WHERE pp.user_profile_id = (
    SELECT id FROM user_profiles WHERE auth_user_id = p_user_id
  )
  AND pp.is_active = TRUE;

  IF v_provider_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get encounter details
  SELECT clinic_id, service_id INTO v_encounter_clinic_id, v_encounter_service_id
  FROM encounters
  WHERE id = p_encounter_id;

  IF v_encounter_clinic_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if provider has active assignment for this clinic + service
  RETURN EXISTS (
    SELECT 1 FROM provider_assignments pa
    WHERE pa.provider_profile_id = v_provider_id
      AND pa.clinic_id = v_encounter_clinic_id
      AND pa.service_id = v_encounter_service_id
      AND pa.is_active = TRUE
      AND pa.effective_from <= CURRENT_DATE
      AND (pa.effective_until IS NULL OR pa.effective_until >= CURRENT_DATE)
  );
END;
$$;

-- Check if provider is assigned to a patient (via care team or encounters)
CREATE OR REPLACE FUNCTION is_provider_assigned_to_patient(
  p_user_id UUID,
  p_patient_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check care team membership
  IF EXISTS (
    SELECT 1 FROM care_team_members ct
    WHERE ct.user_id = p_user_id
      AND ct.patient_id = p_patient_id
      AND ct.is_active = TRUE
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check encounter-based assignment
  RETURN EXISTS (
    SELECT 1 FROM encounters e
    WHERE e.patient_id = p_patient_id
      AND is_provider_assigned_to_encounter(p_user_id, e.id)
  );
END;
$$;

-- Validate user role against database (for business functions)
CREATE OR REPLACE FUNCTION validate_user_role(
  p_user_id UUID,
  p_required_role TEXT
)
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
    WHERE ur.user_id = p_user_id
      AND r.name = p_required_role
      AND ur.is_active = TRUE
      AND r.is_active = TRUE
  );
$$;

-- Revoke from PUBLIC, grant only to authenticated
REVOKE EXECUTE ON FUNCTION get_user_profile_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_provider_profile_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_patient_id_for_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_clinic_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_campus_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION has_role(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION has_permission(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_provider_assigned_to_encounter(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_provider_assigned_to_patient(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION validate_user_role(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_provider_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_id_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_clinic_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_campus_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_assigned_to_encounter(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_assigned_to_patient(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_role(UUID, TEXT) TO service_role;
