-- UCIS Migration: Phase 08 - Provider Assignments
-- Dependencies: Phase 06 (clinics, clinic_services), Phase 07 (provider_profiles)

CREATE TABLE provider_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  service_id UUID NOT NULL REFERENCES clinic_services(id),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_profile_id, clinic_id, service_id, effective_from)
);

CREATE INDEX idx_provider_assignments_provider_profile_id ON provider_assignments(provider_profile_id);
CREATE INDEX idx_provider_assignments_clinic_id ON provider_assignments(clinic_id);
CREATE INDEX idx_provider_assignments_service_id ON provider_assignments(service_id);
