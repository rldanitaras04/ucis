-- Fix created_by FK constraints to reference auth.users(id) instead of provider_profiles(id)
-- This allows any authenticated user to create records, not just provider_profiles holders

-- medical_records
ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_created_by_fkey;
ALTER TABLE medical_records ADD CONSTRAINT medical_records_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- dental_records
ALTER TABLE dental_records DROP CONSTRAINT IF EXISTS dental_records_created_by_fkey;
ALTER TABLE dental_records ADD CONSTRAINT dental_records_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- fbs_records
ALTER TABLE fbs_records DROP CONSTRAINT IF EXISTS fbs_records_created_by_fkey;
ALTER TABLE fbs_records ADD CONSTRAINT fbs_records_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);
