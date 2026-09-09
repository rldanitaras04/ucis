-- UCIS Migration: Phase 24 - Consent
-- Dependencies: Phase 09 (patient_profiles)

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  consent_type TEXT NOT NULL CHECK (consent_type IN ('treatment', 'data_sharing', 'research', 'break_glass')),
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_records_patient_id ON consent_records(patient_id);
