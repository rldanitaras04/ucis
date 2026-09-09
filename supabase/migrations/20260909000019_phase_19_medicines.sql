-- UCIS Migration: Phase 19 - Medicines
-- Dependencies: Phase 01 (extensions)

CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  form TEXT CHECK (form IN ('tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other')),
  strength TEXT,
  manufacturer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE medicine_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES medicines(id),
  batch_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(10,2),
  expiry_date DATE NOT NULL,
  manufactured_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medicine_id, batch_number)
);

CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicine_batches_medicine_id ON medicine_batches(medicine_id);
CREATE INDEX idx_medicine_batches_expiry_date ON medicine_batches(expiry_date);
