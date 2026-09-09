-- UCIS Migration: Phase 15 - Dental Records
-- Dependencies: Phase 13 (encounters)

CREATE TABLE dental_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  created_by UUID NOT NULL REFERENCES provider_profiles(id),
  chief_complaint TEXT,
  oral_examination TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'amended')),
  finalized_at TIMESTAMPTZ,
  amended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dental_record_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_record_id UUID NOT NULL REFERENCES dental_records(id),
  amendment_reason TEXT NOT NULL,
  corrected_data JSONB NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_dental_records_encounter_id ON dental_records(encounter_id);
CREATE INDEX idx_dental_records_patient_id ON dental_records(patient_id);
CREATE INDEX idx_dental_records_created_by ON dental_records(created_by);
CREATE INDEX idx_dental_records_status ON dental_records(status);
CREATE INDEX idx_dental_record_amendments_original_record_id ON dental_record_amendments(original_record_id);
