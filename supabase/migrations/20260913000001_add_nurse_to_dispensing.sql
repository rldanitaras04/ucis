-- Add nurse role to dispensing RLS policy

DROP POLICY IF EXISTS dispensing_insert ON dispensing;
CREATE POLICY dispensing_insert ON dispensing
  FOR INSERT WITH CHECK (
    has_role('clinic_staff') OR has_role('nurse') OR has_role('admin') OR has_role('super_admin')
  );
