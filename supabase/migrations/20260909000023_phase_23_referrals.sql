-- UCIS Migration: Phase 23 - Referrals
-- Dependencies: Phase 09 (patient_profiles), Phase 13 (encounters)

CREATE TABLE clinical_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  referred_by UUID NOT NULL REFERENCES auth.users(id),
  referred_to_clinic_id UUID NOT NULL REFERENCES clinics(id),
  referral_reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'routine' CHECK (urgency IN ('urgent', 'routine', 'elective')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clinical_referrals_patient_id ON clinical_referrals(patient_id);
CREATE INDEX idx_clinical_referrals_status ON clinical_referrals(status);
