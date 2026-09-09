-- UCIS Migration: Phase 03 - User Profiles
-- Dependencies: Phase 01 (extensions)

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'faculty', 'non_teaching_staff', 'walk_in')),
  university_id UUID REFERENCES universities(id),
  campus_id UUID REFERENCES campuses(id),
  employee_student_id TEXT,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT,
  contact_number TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX idx_user_profiles_campus_id ON user_profiles(campus_id);
CREATE INDEX idx_user_profiles_university_id ON user_profiles(university_id);
CREATE INDEX idx_user_profiles_employee_student_id ON user_profiles(employee_student_id);
