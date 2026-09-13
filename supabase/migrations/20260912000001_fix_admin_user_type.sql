-- UCIS Migration: Fix admin user_type CHECK constraint
-- The user_profiles.user_type CHECK constraint only allows
-- 'student', 'faculty', 'non_teaching_staff', 'walk_in'
-- which prevents admin/super_admin users from having profiles.

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_type_check
  CHECK (user_type IN ('student', 'faculty', 'non_teaching_staff', 'walk_in', 'admin', 'super_admin'));
