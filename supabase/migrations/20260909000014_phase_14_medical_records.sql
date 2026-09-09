-- UCIS Migration: Phase 14 - Medical Records
-- Dependencies: Phase 13 (encounters)

CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  created_by UUID NOT NULL REFERENCES provider_profiles(id),
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  physical_examination TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'amended')),
  finalized_at TIMESTAMPTZ,
  amended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medical_record_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_record_id UUID NOT NULL REFERENCES medical_records(id),
  amendment_reason TEXT NOT NULL,
  corrected_data JSONB NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_medical_records_encounter_id ON medical_records(encounter_id);
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_created_by ON medical_records(created_by);
CREATE INDEX idx_medical_records_status ON medical_records(status);
CREATE INDEX idx_medical_record_amendments_original_record_id ON medical_record_amendments(original_record_id);
