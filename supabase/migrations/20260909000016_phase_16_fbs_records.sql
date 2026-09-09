-- UCIS Migration: Phase 16 - FBS Records
-- Dependencies: Phase 13 (encounters)

CREATE TABLE fbs_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  created_by UUID NOT NULL REFERENCES provider_profiles(id),
  fasting_blood_sugar NUMERIC(6,2),
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fbs_records_encounter_id ON fbs_records(encounter_id);
CREATE INDEX idx_fbs_records_patient_id ON fbs_records(patient_id);
