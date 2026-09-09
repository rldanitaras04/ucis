-- UCIS Migration: Phase 33 - Seed Data
-- Dependencies: Phase 32 (RLS policies)

-- ============================================================
-- ROLES
-- ============================================================

INSERT INTO roles (id, name, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'super_admin', 'System-wide administration'),
  ('a0000000-0000-0000-0000-000000000002', 'admin', 'Campus/clinic administration'),
  ('a0000000-0000-0000-0000-000000000003', 'doctor', 'Medical clinical provider'),
  ('a0000000-0000-0000-0000-000000000004', 'dentist', 'Dental clinical provider'),
  ('a0000000-0000-0000-0000-000000000005', 'nurse', 'Clinical support provider'),
  ('a0000000-0000-0000-0000-000000000006', 'clinic_staff', 'Operational support'),
  ('a0000000-0000-0000-0000-000000000007', 'student', 'Student patient'),
  ('a0000000-0000-0000-0000-000000000008', 'faculty', 'Faculty patient'),
  ('a0000000-0000-0000-0000-000000000009', 'non_teaching_staff', 'Staff patient');

-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (id, name, description, sensitivity, is_clinical) VALUES
  -- System
  ('b0000000-0000-0000-0000-000000000001', 'system.configure', 'Configure system settings', 'INTERNAL', FALSE),
  ('b0000000-0000-0000-0000-000000000002', 'roles.manage', 'Manage roles and permissions', 'INTERNAL', FALSE),
  ('b0000000-0000-0000-0000-000000000003', 'users.manage', 'Manage user accounts', 'INTERNAL', FALSE),
  ('b0000000-0000-0000-0000-000000000004', 'audit_logs.view', 'View audit logs', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000005', 'reports.export', 'Export reports', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000006', 'reports.view', 'View reports', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000007', 'clinics.manage', 'Manage clinic configuration', 'INTERNAL', FALSE),
  ('b0000000-0000-0000-0000-000000000008', 'inventory.manage', 'Manage inventory', 'INTERNAL', FALSE),
  ('b0000000-0000-0000-0000-000000000009', 'announcements.manage', 'Manage announcements', 'PUBLIC', FALSE),
  -- Medical
  ('b0000000-0000-0000-0000-000000000010', 'medical_records.view', 'View medical records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000011', 'medical_records.create', 'Create medical records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000012', 'medical_records.update', 'Update medical records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000013', 'medical_records.finalize', 'Finalize medical records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000014', 'medical_records.amend', 'Amend finalized medical records', 'HIGHLY_CONFIDENTIAL', TRUE),
  -- Dental
  ('b0000000-0000-0000-0000-000000000015', 'dental_records.view', 'View dental records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000016', 'dental_records.create', 'Create dental records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000017', 'dental_records.update', 'Update dental records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000018', 'dental_records.finalize', 'Finalize dental records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000019', 'dental_records.amend', 'Amend finalized dental records', 'HIGHLY_CONFIDENTIAL', TRUE),
  -- Prescriptions
  ('b0000000-0000-0000-0000-000000000020', 'prescriptions.create', 'Create prescriptions', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000021', 'prescriptions.view', 'View prescriptions', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000022', 'prescriptions.dispense', 'Dispense prescriptions', 'HIGHLY_CONFIDENTIAL', TRUE),
  -- Other clinical
  ('b0000000-0000-0000-0000-000000000023', 'referrals.create', 'Create referrals', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000024', 'clearances.create', 'Create clearances', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000025', 'fbs_records.view', 'View FBS records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000026', 'fbs_records.create', 'Create FBS records', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000027', 'odontograms.create', 'Create odontograms', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000028', 'odontograms.view', 'View odontograms', 'HIGHLY_CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000029', 'vitals.view', 'View vitals', 'CONFIDENTIAL', TRUE),
  ('b0000000-0000-0000-0000-000000000030', 'vitals.create', 'Create vitals', 'CONFIDENTIAL', TRUE),
  -- Queue/Patients
  ('b0000000-0000-0000-0000-000000000031', 'queue.view', 'View queue', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000032', 'queue.manage', 'Manage queue', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000033', 'patients.register', 'Register patients', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000034', 'patients.view', 'View patients', 'CONFIDENTIAL', FALSE),
  ('b0000000-0000-0000-0000-000000000035', 'documents.manage', 'Manage documents', 'CONFIDENTIAL', FALSE);

-- ============================================================
-- ROLE-PERMISSION ASSIGNMENTS
-- ============================================================

-- Super Admin: all system permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN ('system.configure', 'roles.manage', 'users.manage', 'audit_logs.view', 'reports.export');

-- Admin: campus management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN ('users.manage', 'clinics.manage', 'inventory.manage', 'announcements.manage', 'reports.view', 'audit_logs.view');

-- Doctor: medical clinical
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN ('medical_records.view', 'medical_records.create', 'medical_records.update', 'medical_records.finalize', 'medical_records.amend', 'prescriptions.create', 'prescriptions.view', 'referrals.create', 'clearances.create', 'fbs_records.view');

-- Dentist: dental clinical
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000004', id FROM permissions
WHERE name IN ('dental_records.view', 'dental_records.create', 'dental_records.update', 'dental_records.finalize', 'dental_records.amend', 'odontograms.create', 'odontograms.view', 'referrals.create', 'clearances.create');

-- Nurse: clinical support
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000005', id FROM permissions
WHERE name IN ('fbs_records.view', 'fbs_records.create', 'vitals.view', 'vitals.create', 'queue.view', 'patients.view');

-- Clinic Staff: operational
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000006', id FROM permissions
WHERE name IN ('queue.manage', 'patients.register', 'documents.manage', 'inventory.manage', 'prescriptions.dispense');

-- Student/Faculty/Non-Teaching Staff: own records only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000007', id FROM permissions
WHERE name IN ('medical_records.view', 'dental_records.view', 'fbs_records.view', 'prescriptions.view', 'clearances.create');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000008', id FROM permissions
WHERE name IN ('medical_records.view', 'dental_records.view', 'fbs_records.view', 'prescriptions.view', 'clearances.create');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000009', id FROM permissions
WHERE name IN ('medical_records.view', 'dental_records.view', 'fbs_records.view', 'prescriptions.view', 'clearances.create');
