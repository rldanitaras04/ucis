-- UCIS Migration: Phase 06 - Clinics/Services
-- Dependencies: Phase 02 (campuses)

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  contact_phone TEXT,
  operating_hours TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campus_id, name)
);

CREATE TABLE clinic_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('medical', 'dental', 'fbs', 'pharmacy', 'general')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, name)
);

CREATE INDEX idx_clinics_campus_id ON clinics(campus_id);
CREATE INDEX idx_clinic_services_clinic_id ON clinic_services(clinic_id);
