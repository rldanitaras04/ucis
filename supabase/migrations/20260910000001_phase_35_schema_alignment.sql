-- UCIS Migration: Phase 35 - Schema Alignment
-- Fixes mismatches between application code and database schema
-- Creates missing tables and adds missing columns

-- ============================================================
-- 1. CREATE vital_signs TABLE (missing entirely)
-- ============================================================
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID REFERENCES encounters(id),
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  pulse_rate INTEGER,
  respiratory_rate INTEGER,
  temperature NUMERIC(4,1),
  oxygen_saturation NUMERIC(5,2),
  height NUMERIC(5,1),
  weight NUMERIC(5,1),
  bmi NUMERIC(4,1),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_encounter_id ON vital_signs(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON vital_signs(recorded_at);

ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY vital_signs_select ON vital_signs
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR (has_role('doctor') AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)))
    OR (has_role('nurse') AND patient_id IN (
      SELECT pt.patient_id FROM care_team_members pt
      WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE))
    OR has_role('admin')
    OR has_role('super_admin')
  );

CREATE POLICY vital_signs_insert ON vital_signs
  FOR INSERT WITH CHECK (
    (has_role('nurse') OR has_role('doctor'))
    AND recorded_by = auth.uid()
  );

-- ============================================================
-- 2. CREATE follow_ups TABLE (missing entirely)
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID REFERENCES encounters(id),
  scheduled_by UUID NOT NULL REFERENCES auth.users(id),
  scheduled_date DATE NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_patient_id ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_encounter_id ON follow_ups(encounter_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_date ON follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY follow_ups_select ON follow_ups
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR (has_role('doctor') AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)))
    OR (has_role('nurse') AND patient_id IN (
      SELECT pt.patient_id FROM care_team_members pt
      WHERE pt.user_id = auth.uid() AND pt.is_active = TRUE))
    OR has_role('admin')
    OR has_role('super_admin')
  );

CREATE POLICY follow_ups_insert ON follow_ups
  FOR INSERT WITH CHECK (
    has_role('doctor') OR has_role('dentist') OR has_role('admin') OR has_role('super_admin')
  );

CREATE POLICY follow_ups_update ON follow_ups
  FOR UPDATE USING (
    has_role('doctor') OR has_role('dentist') OR has_role('admin') OR has_role('super_admin')
  );

CREATE TRIGGER trg_follow_ups_no_delete
  BEFORE DELETE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- ============================================================
-- 3. ADD missing columns to prescriptions table
--    App code uses: medication_name, dosage, frequency, duration,
--    quantity, refills, instructions, prescribed_by
--    DB has: created_by (not prescribed_by), no medication columns
--    Solution: Add the columns the app expects
-- ============================================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medication_name TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dosage TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS refills INTEGER DEFAULT 0;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescribed_by UUID REFERENCES auth.users(id);

-- ============================================================
-- 4. ADD missing columns to incidents table
--    App code uses: incident_type, patient_id, incident_date
--    DB has: title, description (no incident_type, no patient_id)
-- ============================================================
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_type TEXT DEFAULT 'clinical';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patient_profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 5. ADD missing columns to clearances table
--    App code uses: control_number, issue_date, expiry_date
--    DB has: valid_until (not expiry_date), issued_at (not issue_date), no control_number
-- ============================================================
ALTER TABLE clearances ADD COLUMN IF NOT EXISTS control_number TEXT;
ALTER TABLE clearances ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clearances ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ============================================================
-- 6. CREATE referrals TABLE (app uses 'referrals', DB has 'clinical_referrals')
--    Create a view or aliases. Since the app queries 'referrals' table directly,
--    create the table the app expects.
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  encounter_id UUID REFERENCES encounters(id),
  from_clinic_id UUID REFERENCES clinics(id),
  to_clinic_id UUID REFERENCES clinics(id),
  referred_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  notes TEXT,
  urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('urgent', 'routine', 'elective')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  referral_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_encounter_id ON referrals(encounter_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_select ON referrals
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR (has_role('doctor') AND encounter_id IN (
      SELECT e.id FROM encounters e
      WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)))
    OR has_role('admin')
    OR has_role('super_admin')
  );

CREATE POLICY referrals_insert ON referrals
  FOR INSERT WITH CHECK (
    has_role('doctor') OR has_role('dentist') OR has_role('admin') OR has_role('super_admin')
  );

CREATE POLICY referrals_update ON referrals
  FOR UPDATE USING (
    has_role('doctor') OR has_role('dentist') OR has_role('admin') OR has_role('super_admin')
  );

CREATE TRIGGER trg_referrals_no_delete
  BEFORE DELETE ON referrals
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- ============================================================
-- 7. ADD missing columns to fbs_records
--    App code uses: fbs_value, fasting_hours, recorded_by, recorded_at
--    DB has: fasting_blood_sugar, test_date, created_by, no fasting_hours
-- ============================================================
ALTER TABLE fbs_records ADD COLUMN IF NOT EXISTS fbs_value NUMERIC(6,2);
ALTER TABLE fbs_records ADD COLUMN IF NOT EXISTS fasting_hours NUMERIC(4,1);
ALTER TABLE fbs_records ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES auth.users(id);
ALTER TABLE fbs_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill from existing columns
UPDATE fbs_records SET fbs_value = fasting_blood_sugar WHERE fbs_value IS NULL AND fasting_blood_sugar IS NOT NULL;
UPDATE fbs_records SET recorded_at = created_at WHERE recorded_at IS NULL;

-- ============================================================
-- 8. ADD missing columns to dispensing table
--    App code uses: 'dispensing' table with prescription_id, patient_id
--    DB has: 'dispensing_records' with prescription_item_id, medicine_batch_id
--    Solution: Create 'dispensing' view/table the app expects
-- ============================================================
CREATE TABLE IF NOT EXISTS dispensing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  patient_id UUID NOT NULL REFERENCES patient_profiles(id),
  dispensed_by UUID NOT NULL REFERENCES auth.users(id),
  quantity_dispensed INTEGER NOT NULL,
  batch_number TEXT,
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispensing_prescription_id ON dispensing(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_patient_id ON dispensing(patient_id);

ALTER TABLE dispensing ENABLE ROW LEVEL SECURITY;

CREATE POLICY dispensing_select ON dispensing
  FOR SELECT USING (
    patient_id = get_patient_id_for_user()
    OR has_role('clinic_staff')
    OR has_role('admin')
    OR has_role('super_admin')
  );

CREATE POLICY dispensing_insert ON dispensing
  FOR INSERT WITH CHECK (
    has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin')
  );

CREATE TRIGGER trg_dispensing_no_delete
  BEFORE DELETE ON dispensing
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- ============================================================
-- 9. ENABLE RLS on tables that may not have it
-- ============================================================
ALTER TABLE clinic_services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'clinic_services_select' AND tablename = 'clinic_services') THEN
    CREATE POLICY clinic_services_select ON clinic_services
      FOR SELECT USING (
        has_role('super_admin')
        OR (has_role('admin'))
        OR (clinic_id IN (SELECT unnest(get_user_clinic_ids())))
      );
  END IF;
END $$;

ALTER TABLE queue_counters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'queue_counters_select' AND tablename = 'queue_counters') THEN
    CREATE POLICY queue_counters_select ON queue_counters
      FOR SELECT USING (TRUE);
    CREATE POLICY queue_counters_insert ON queue_counters
      FOR INSERT WITH CHECK (has_role('clinic_staff') OR has_role('nurse') OR has_role('admin') OR has_role('super_admin'));
    CREATE POLICY queue_counters_update ON queue_counters
      FOR UPDATE USING (has_role('clinic_staff') OR has_role('nurse') OR has_role('admin') OR has_role('super_admin'));
  END IF;
END $$;

ALTER TABLE medicine_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'medicine_batches_select' AND tablename = 'medicine_batches') THEN
    CREATE POLICY medicine_batches_select ON medicine_batches FOR SELECT USING (TRUE);
  END IF;
END $$;

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'medicines_select' AND tablename = 'medicines') THEN
    CREATE POLICY medicines_select ON medicines FOR SELECT USING (TRUE);
    CREATE POLICY medicines_insert ON medicines FOR INSERT WITH CHECK (has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin'));
    CREATE POLICY medicines_update ON medicines FOR UPDATE USING (has_role('clinic_staff') OR has_role('admin') OR has_role('super_admin'));
    CREATE POLICY medicines_delete ON medicines FOR DELETE USING (has_role('admin') OR has_role('super_admin'));
  END IF;
END $$;

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prescription_items_select' AND tablename = 'prescription_items') THEN
    CREATE POLICY prescription_items_select ON prescription_items
      FOR SELECT USING (
        prescription_id IN (
          SELECT p.id FROM prescriptions p
          WHERE p.patient_id = get_patient_id_for_user()
          OR (has_role('doctor') AND p.encounter_id IN (
            SELECT e.id FROM encounters e WHERE is_provider_assigned_to_encounter(auth.uid(), e.id)))
        )
        OR has_role('admin')
        OR has_role('super_admin')
      );
  END IF;
END $$;

-- ============================================================
-- 10. ATOMIC QUEUE NUMBER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_queue_number(
  p_clinic_id UUID,
  p_service_id UUID,
  p_queue_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  -- Upsert the counter atomically
  INSERT INTO queue_counters (clinic_id, service_id, queue_date, last_number)
  VALUES (p_clinic_id, p_service_id, p_queue_date, 1)
  ON CONFLICT (clinic_id, service_id, queue_date)
  DO UPDATE SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_queue_number(UUID, UUID, DATE) TO authenticated;
