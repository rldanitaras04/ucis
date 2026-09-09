-- UCIS Migration: Phase 20 - Dispensing
-- Dependencies: Phase 18 (prescriptions, prescription_items), Phase 19 (medicines, medicine_batches)

CREATE TABLE dispensing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_item_id UUID NOT NULL REFERENCES prescription_items(id),
  medicine_batch_id UUID NOT NULL REFERENCES medicine_batches(id),
  quantity_dispensed INTEGER NOT NULL,
  dispensed_by UUID NOT NULL REFERENCES auth.users(id),
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_batch_id UUID NOT NULL REFERENCES medicine_batches(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('dispensing', 'restock', 'adjustment', 'return')),
  quantity_change INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispensing_records_prescription_item_id ON dispensing_records(prescription_item_id);
CREATE INDEX idx_dispensing_records_medicine_batch_id ON dispensing_records(medicine_batch_id);
CREATE INDEX idx_inventory_transactions_medicine_batch_id ON inventory_transactions(medicine_batch_id);
