export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'doctor'
  | 'dentist'
  | 'nurse'
  | 'clinic_staff'
  | 'student'
  | 'faculty'
  | 'non_teaching_staff';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  user_type: 'student' | 'faculty' | 'non_teaching_staff' | 'walk_in';
  university_id?: string;
  campus_id?: string;
  employee_student_id?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  contact_number?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface PatientProfile {
  id: string;
  user_profile_id?: string;
  university_id?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth: string;
  gender: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  campus_id?: string;
  clinic_id?: string;
  patient_type: 'student' | 'faculty' | 'non_teaching_staff' | 'walk_in';
  status: 'active' | 'inactive' | 'deceased';
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  user_profile_id: string;
  provider_type: 'doctor' | 'dentist';
  license_number?: string;
  specialty?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderAssignment {
  id: string;
  provider_profile_id: string;
  clinic_id: string;
  service_id: string;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  created_at: string;
}

export interface Clinic {
  id: string;
  campus_id: string;
  name: string;
  description?: string;
  location?: string;
  contact_phone?: string;
  operating_hours?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicService {
  id: string;
  clinic_id: string;
  name: string;
  category: 'medical' | 'dental' | 'fbs' | 'pharmacy' | 'general';
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  queue_entry_id?: string;
  clinic_id: string;
  service_id: string;
  provider_id?: string;
  visit_date: string;
  chief_complaint?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  created_by: string;
  chief_complaint?: string;
  history_of_present_illness?: string;
  physical_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  status: 'draft' | 'finalized' | 'amended';
  finalized_at?: string;
  amended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DentalRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  created_by: string;
  chief_complaint?: string;
  oral_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  status: 'draft' | 'finalized' | 'amended';
  finalized_at?: string;
  amended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  encounter_id: string;
  patient_id: string;
  created_by: string;
  prescribed_date: string;
  notes?: string;
  status: 'active' | 'dispensed' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity: number;
  refills_allowed: number;
  notes?: string;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  queue_number: number;
  clinic_id: string;
  service_id: string;
  patient_id: string;
  encounter_id?: string;
  queue_date: string;
  status: 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled';
  priority: number;
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface Document {
  id: string;
  document_control_number: string;
  patient_id: string;
  encounter_id?: string;
  document_type: 'medical_certificate' | 'dental_certificate' | 'clearance' | 'referral' | 'prescription_record';
  issued_by: string;
  issued_at: string;
  status: 'active' | 'revoked' | 'expired';
  verification_token: string;
  verification_expires_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Clearance {
  id: string;
  patient_id: string;
  encounter_id: string;
  clearance_type: 'medical' | 'dental' | 'general';
  issued_by: string;
  issued_at: string;
  valid_until: string;
  status: 'active' | 'revoked' | 'expired';
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changed_fields?: string[];
  reason?: string;
  correlation_id?: string;
  outcome?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  notification_type: 'info' | 'warning' | 'security_alert' | 'appointment' | 'queue';
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface BreakGlassAccess {
  id: string;
  user_id: string;
  patient_id: string;
  reason: string;
  granted_by: string;
  granted_at: string;
  expires_at: string;
  audit_trail: Record<string, unknown>;
}
