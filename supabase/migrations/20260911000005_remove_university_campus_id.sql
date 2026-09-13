-- UCIS Migration: Remove university_id and campus_id from all tables
-- These columns are unused; the app does not reference them.

-- ============================================================
-- 1. Drop columns from user_profiles
-- ============================================================
ALTER TABLE user_profiles DROP COLUMN IF EXISTS university_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS campus_id;

-- ============================================================
-- 2. Drop columns from announcements
-- ============================================================
ALTER TABLE announcements DROP COLUMN IF EXISTS campus_id;

-- ============================================================
-- 3. Drop columns from incidents
-- ============================================================
ALTER TABLE incidents DROP COLUMN IF EXISTS campus_id;
