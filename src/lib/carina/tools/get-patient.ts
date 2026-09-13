import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getPatientTool: CarinaToolDefinition = {
  name: 'get_patient',
  description: 'Get a single patient full profile by ID. Returns demographics and basic information.',
  allowedRoles: ['doctor', 'dentist', 'nurse', 'clinic_staff', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
    },
    required: ['patient_id'],
  },
  handler: async (args) => {
    const supabase = createServerSupabaseClient();
    const patientId = args.patient_id as string;

    const { data, error } = await supabase
      .from('patient_profiles')
      .select('id, blood_type, allergies, emergency_contact_name, emergency_contact_phone, created_at, user_profile:user_profiles!user_profile_id(first_name, middle_name, last_name, suffix, date_of_birth, gender, contact_number, email, address, user_type, status, employee_student_id)')
      .eq('id', patientId)
      .single();

    if (error) {
      return { success: false, error: 'Patient not found' };
    }

    return {
      success: true,
      data,
    };
  },
};
