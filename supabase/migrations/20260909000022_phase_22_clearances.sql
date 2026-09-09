-- UCIS Migration: Phase 22 - Clearances
-- Dependencies: Phase 09 (patient_profiles), Phase 13 (encounters)

CREATE TABLE clearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  clearance_type TEXT NOT NULL CHECK (clearance_type IN ('medical', 'dental', 'general')),
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clearances_patient_id ON clearances(patient_id);
CREATE INDEX idx_clearances_status ON clearances(status);
