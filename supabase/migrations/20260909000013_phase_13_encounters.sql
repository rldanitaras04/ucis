-- UCIS Migration: Phase 13 - Encounters
-- Dependencies: Phase 09 (patient_profiles), Phase 12 (queue_entries)

CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  queue_entry_id UUID UNIQUE REFERENCES queue_entries(id),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  service_id UUID NOT NULL REFERENCES clinic_services(id),
  provider_id UUID REFERENCES provider_profiles(id),
  visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chief_complaint TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update queue_entries to reference encounters (circular FK resolved here)
ALTER TABLE queue_entries
  ADD CONSTRAINT fk_queue_entries_encounter
  FOREIGN KEY (encounter_id) REFERENCES encounters(id);

CREATE INDEX idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX idx_encounters_clinic_id ON encounters(clinic_id);
CREATE INDEX idx_encounters_service_id ON encounters(service_id);
CREATE INDEX idx_encounters_provider_id ON encounters(provider_id);
CREATE INDEX idx_encounters_status ON encounters(status);
