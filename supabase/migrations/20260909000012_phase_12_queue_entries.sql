-- UCIS Migration: Phase 12 - Queue Entries
-- Dependencies: Phase 09 (patient_profiles), Phase 11 (queue_counters)

CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number INTEGER NOT NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  service_id UUID NOT NULL REFERENCES clinic_services(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID,
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, service_id, queue_date, queue_number)
);

CREATE INDEX idx_queue_entries_clinic_id ON queue_entries(clinic_id);
CREATE INDEX idx_queue_entries_service_id ON queue_entries(service_id);
CREATE INDEX idx_queue_entries_patient_id ON queue_entries(patient_id);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);
CREATE INDEX idx_queue_entries_queue_date ON queue_entries(queue_date);
