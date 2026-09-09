-- UCIS Migration: Phase 09 - Patient Profiles
-- Dependencies: Phase 03 (user_profiles)

CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  university_id TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  campus_id UUID REFERENCES campuses(id),
  clinic_id UUID REFERENCES clinics(id),
  patient_type TEXT NOT NULL DEFAULT 'student' CHECK (patient_type IN ('student', 'faculty', 'non_teaching_staff', 'walk_in')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-to-one constraint: user_profile_id is UNIQUE
-- Walk-in uniqueness: university_id UNIQUE WHERE user_profile_id IS NULL
CREATE UNIQUE INDEX idx_patient_profiles_walkin_unique 
  ON patient_profiles(university_id) 
  WHERE user_profile_id IS NULL;

CREATE INDEX idx_patient_profiles_user_profile_id ON patient_profiles(user_profile_id);
CREATE INDEX idx_patient_profiles_campus_id ON patient_profiles(campus_id);
CREATE INDEX idx_patient_profiles_clinic_id ON patient_profiles(clinic_id);
