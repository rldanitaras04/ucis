-- UCIS Migration: Phase 11 - Queue Infrastructure
-- Dependencies: Phase 06 (clinics, clinic_services)

CREATE TABLE queue_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  service_id UUID NOT NULL REFERENCES clinic_services(id),
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, service_id, queue_date)
);
