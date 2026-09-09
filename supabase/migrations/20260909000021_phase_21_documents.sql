-- UCIS Migration: Phase 21 - Documents
-- Dependencies: Phase 09 (patient_profiles), Phase 13 (encounters)

CREATE TABLE document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID NOT NULL REFERENCES campuses(id),
  document_type TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campus_id, document_type)
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_control_number TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID REFERENCES encounters(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('medical_certificate', 'dental_certificate', 'clearance', 'referral', 'prescription_record')),
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  verification_token TEXT NOT NULL UNIQUE,
  verification_expires_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  ip_address INET
);

CREATE INDEX idx_documents_patient_id ON documents(patient_id);
CREATE INDEX idx_documents_control_number ON documents(document_control_number);
CREATE INDEX idx_documents_verification_token ON documents(verification_token);
CREATE INDEX idx_document_verification_logs_document_id ON document_verification_logs(document_id);
