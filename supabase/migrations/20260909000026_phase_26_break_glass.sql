-- UCIS Migration: Phase 26 - Break-Glass
-- Dependencies: Phase 03 (user_profiles), Phase 09 (patient_profiles)

-- Break-glass reason codes
CREATE TYPE break_glass_reason AS ENUM (
  'EMERGENCY_MEDICAL',
  'EMERGENCY_DENTAL',
  'ACTIVE_INCIDENT',
  'COMPLIANCE_AUDIT',
  'SUPERVISING_PROVIDER'
);

CREATE TABLE break_glass_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  reason break_glass_reason NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  audit_trail JSONB NOT NULL
);

CREATE INDEX idx_break_glass_access_user_id ON break_glass_access(user_id);
CREATE INDEX idx_break_glass_access_patient_id ON break_glass_access(patient_id);
CREATE INDEX idx_break_glass_access_expires_at ON break_glass_access(expires_at);
