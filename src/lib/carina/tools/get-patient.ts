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
      .select('id, first_name, middle_name, last_name, suffix, date_of_birth, gender, blood_type, allergies, contact_number, email, address, patient_type, status, created_at')
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
