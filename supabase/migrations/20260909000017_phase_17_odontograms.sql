-- UCIS Migration: Phase 17 - Odontograms
-- Dependencies: Phase 13 (encounters)

CREATE TABLE odontogram_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  created_by UUID NOT NULL REFERENCES provider_profiles(id),
  tooth_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: odontograms are append-only (immutable)
);

CREATE INDEX idx_odontogram_records_encounter_id ON odontogram_records(encounter_id);
CREATE INDEX idx_odontogram_records_patient_id ON odontogram_records(patient_id);
