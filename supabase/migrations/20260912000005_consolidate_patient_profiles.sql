-- Consolidate patient_profiles: remove redundant fields, keep only medical data
-- Demographics now come from user_profiles via user_profile_id

-- Step 1: Migrate existing data from patient_profiles to user_profiles (if user_profile_id exists)
-- First, update user_profiles with data from patient_profiles where user_profile_id is linked
UPDATE user_profiles up
SET
  first_name = COALESCE(up.first_name, pp.first_name),
  middle_name = COALESCE(up.middle_name, pp.middle_name),
  last_name = COALESCE(up.last_name, pp.last_name),
  suffix = COALESCE(up.suffix, pp.suffix),
  date_of_birth = COALESCE(up.date_of_birth, pp.date_of_birth),
  gender = COALESCE(up.gender, pp.gender),
  contact_number = COALESCE(up.contact_number, pp.contact_number),
  email = COALESCE(up.email, pp.email),
  address = COALESCE(up.address, pp.address),
  employee_student_id = COALESCE(up.employee_student_id, pp.employee_student_id),
  college = COALESCE(up.college, pp.college),
  course = COALESCE(up.course, pp.course),
  year_level = COALESCE(up.year_level, pp.year_level),
  department = COALESCE(up.department, pp.department),
  position = COALESCE(up.position, pp.position),
  updated_at = NOW()
FROM patient_profiles pp
WHERE up.id = pp.user_profile_id;

-- Step 2: Drop redundant columns from patient_profiles
ALTER TABLE patient_profiles
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS middle_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS suffix,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS employee_student_id,
  DROP COLUMN IF EXISTS college,
  DROP COLUMN IF EXISTS course,
  DROP COLUMN IF EXISTS year_level,
  DROP COLUMN IF EXISTS department,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS patient_type,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS campus_id;

-- Step 3: Drop the walkin unique index (was on employee_student_id)
DROP INDEX IF EXISTS idx_patient_profiles_walkin_unique;

-- Step 4: Make auth_user_id nullable for walk-in patients (no auth account)
ALTER TABLE user_profiles ALTER COLUMN auth_user_id DROP NOT NULL;

-- Step 5: Update register_patient RPC to insert demographics into user_profiles
DROP FUNCTION IF EXISTS register_patient(TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION register_patient(
  p_first_name TEXT,
  p_last_name TEXT,
  p_date_of_birth DATE,
  p_gender TEXT,
  p_user_type TEXT DEFAULT 'student',
  p_middle_name TEXT DEFAULT NULL,
  p_suffix TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_contact_number TEXT DEFAULT NULL,
  p_blood_type TEXT DEFAULT NULL,
  p_allergies TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_employee_student_id TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_college TEXT DEFAULT NULL,
  p_course TEXT DEFAULT NULL,
  p_year_level TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_profile_id UUID;
  new_patient_id UUID;
BEGIN
  IF p_user_type NOT IN ('student', 'faculty', 'non_teaching_staff') THEN
    RAISE EXCEPTION 'Patient user_type must be student, faculty, or non_teaching_staff';
  END IF;

  -- Insert demographics into user_profiles
  INSERT INTO user_profiles (
    user_type, employee_student_id, first_name, middle_name, last_name, suffix,
    date_of_birth, gender, email, contact_number, address,
    college, course, year_level, department, position, status
  ) VALUES (
    p_user_type, p_employee_student_id, p_first_name, p_middle_name, p_last_name, p_suffix,
    p_date_of_birth, p_gender, p_email, p_contact_number, p_address,
    p_college, p_course, p_year_level, p_department, p_position, 'active'
  )
  RETURNING id INTO new_user_profile_id;

  -- Insert medical data into patient_profiles
  INSERT INTO patient_profiles (
    user_profile_id, blood_type, allergies,
    emergency_contact_name, emergency_contact_phone
  ) VALUES (
    new_user_profile_id, p_blood_type, p_allergies,
    p_emergency_contact_name, p_emergency_contact_phone
  )
  RETURNING id INTO new_patient_id;

  RETURN new_patient_id;
END;
$$;
