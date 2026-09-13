-- UCIS Migration: Add nurse role to medicine inventory RLS policies
-- Dependencies: Phase 35 (schema alignment with medicines + medicine_batches RLS)

-- Medicines: Add nurse to INSERT, UPDATE, DELETE policies
DROP POLICY IF EXISTS medicines_insert ON medicines;
CREATE POLICY medicines_insert ON medicines
  FOR INSERT WITH CHECK (
    has_role('nurse') OR has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin')
  );

DROP POLICY IF EXISTS medicines_update ON medicines;
CREATE POLICY medicines_update ON medicines
  FOR UPDATE USING (
    has_role('nurse') OR has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin')
  );

DROP POLICY IF EXISTS medicines_delete ON medicines;
CREATE POLICY medicines_delete ON medicines
  FOR DELETE USING (
    has_role('nurse') OR has_role('admin') OR has_role('super_admin')
  );

-- Medicine batches: Add INSERT, UPDATE policies for nurse (SELECT already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'medicine_batches_insert' AND tablename = 'medicine_batches') THEN
    CREATE POLICY medicine_batches_insert ON medicine_batches
      FOR INSERT WITH CHECK (
        has_role('nurse') OR has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'medicine_batches_update' AND tablename = 'medicine_batches') THEN
    CREATE POLICY medicine_batches_update ON medicine_batches
      FOR UPDATE USING (
        has_role('nurse') OR has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'medicine_batches_delete' AND tablename = 'medicine_batches') THEN
    CREATE POLICY medicine_batches_delete ON medicine_batches
      FOR DELETE USING (
        has_role('nurse') OR has_role('admin') OR has_role('super_admin')
      );
  END IF;
END $$;
