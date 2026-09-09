import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getPatientEncountersTool: CarinaToolDefinition = {
  name: 'get_patient_encounters',
  description: 'Get encounter history for a patient. Returns visits with dates, clinics, and status.',
  allowedRoles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
      limit: {
        type: 'string',
        description: 'Maximum encounters to return (default 20)',
      },
    },
    required: ['patient_id'],
  },
  handler: async (args) => {
    const supabase = createServerSupabaseClient();
    const patientId = args.patient_id as string;
    const limit = parseInt(args.limit as string || '20', 10);

    const { data, error } = await supabase
      .from('encounters')
      .select('id, visit_date, chief_complaint, status, clinic_id, service_id, created_at')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        encounters: data,
        count: data?.length || 0,
      },
    };
  },
};
