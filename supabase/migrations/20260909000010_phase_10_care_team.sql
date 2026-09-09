-- UCIS Migration: Phase 10 - Care Team
-- Dependencies: Phase 07 (provider_profiles), Phase 09 (patient_profiles)

CREATE TABLE care_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary_provider', 'nurse', 'consultant')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_team_members_patient_id ON care_team_members(patient_id);
CREATE INDEX idx_care_team_members_user_id ON care_team_members(user_id);
