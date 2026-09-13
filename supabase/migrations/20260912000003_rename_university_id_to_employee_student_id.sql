-- Rename university_id to employee_student_id in register_patient RPC
-- and update the walkin unique index

DROP FUNCTION IF EXISTS register_patient(TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

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
  p_employee_student_id TEXT DEFAULT NULL,
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
    employee_student_id, address, status
  ) VALUES (
    p_first_name, p_middle_name, p_last_name, p_suffix,
    p_date_of_birth, p_gender, p_patient_type,
    p_email, p_contact_number, p_blood_type, p_allergies,
    p_emergency_contact_name, p_emergency_contact_phone,
    p_employee_student_id, p_address, 'active'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

DROP INDEX IF EXISTS idx_patient_profiles_walkin_unique;
CREATE UNIQUE INDEX idx_patient_profiles_walkin_unique 
  ON patient_profiles(employee_student_id) 
  WHERE user_profile_id IS NULL;
