-- Phase 38: System Configuration Library
-- Manages dropdown options that may change over time

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(config_key, config_value)
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- RLS: all authenticated can read, admin/super_admin can manage
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_config_select ON system_config;
CREATE POLICY system_config_select ON system_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS system_config_insert ON system_config;
CREATE POLICY system_config_insert ON system_config
  FOR INSERT TO authenticated
  WITH CHECK (has_role('super_admin') OR has_role('admin'));

DROP POLICY IF EXISTS system_config_update ON system_config;
CREATE POLICY system_config_update ON system_config
  FOR UPDATE TO authenticated
  USING (has_role('super_admin') OR has_role('admin'));

DROP POLICY IF EXISTS system_config_delete ON system_config;
CREATE POLICY system_config_delete ON system_config
  FOR DELETE TO authenticated
  USING (has_role('super_admin') OR has_role('admin'));

-- Seed: patient_type options
INSERT INTO system_config (config_key, config_value, label, sort_order) VALUES
  ('patient_type', 'student', 'Student', 1),
  ('patient_type', 'faculty', 'Faculty', 2),
  ('patient_type', 'non_teaching_staff', 'Non-Teaching Staff', 3),
  ('patient_type', 'non_teaching_staff', 'Non-Teaching Staff', 3)
ON CONFLICT (config_key, config_value) DO NOTHING;

-- Seed: user_type options
INSERT INTO system_config (config_key, config_value, label, sort_order) VALUES
  ('user_type', 'student', 'Student', 1),
  ('user_type', 'faculty', 'Faculty', 2),
  ('user_type', 'non_teaching_staff', 'Non-Teaching Staff', 3)
ON CONFLICT (config_key, config_value) DO NOTHING;
