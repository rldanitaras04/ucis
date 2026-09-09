-- UCIS Superadmin Seed Script
-- Run this AFTER creating the superadmin user via Supabase Auth dashboard
-- or after registering through the app.

-- ============================================================
-- STEP 1: Create superadmin user in Supabase Auth
-- ============================================================
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Email: admin@ucis.local
-- Password: SuperAdmin123!
-- Email Confirm: true

-- ============================================================
-- STEP 2: Run this script with the auth_user_id from Step 1
-- ============================================================
-- Replace 'REPLACE_WITH_AUTH_USER_ID' with the actual UUID

-- Create user profile
INSERT INTO user_profiles (
  auth_user_id,
  user_type,
  first_name,
  last_name,
  email,
  status,
  campus_id
) VALUES (
  'REPLACE_WITH_AUTH_USER_ID',  -- Replace with actual auth user UUID
  'admin',
  'System',
  'Administrator',
  'admin@ucis.local',
  'active',
  (SELECT id FROM campuses LIMIT 1)
)
ON CONFLICT (auth_user_id) DO NOTHING;

-- Assign super_admin role
INSERT INTO user_roles (user_id, role_id, is_active)
SELECT 
  'REPLACE_WITH_AUTH_USER_ID',  -- Replace with actual auth user UUID
  (SELECT id FROM roles WHERE name = 'super_admin'),
  true
ON CONFLICT DO NOTHING;

-- Verify
SELECT 
  up.first_name,
  up.last_name,
  up.email,
  r.name as role
FROM user_profiles up
JOIN user_roles ur ON ur.user_id = up.auth_user_id
JOIN roles r ON r.id = ur.role_id
WHERE up.auth_user_id = 'REPLACE_WITH_AUTH_USER_ID';
