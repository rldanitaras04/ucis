import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getVitalSignsTool: CarinaToolDefinition = {
  name: 'get_vital_signs',
  description: 'Get vital signs history for a patient. Returns blood pressure, pulse, temperature, and other vitals.',
  allowedRoles: ['nurse', 'doctor', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
      limit: {
        type: 'string',
        description: 'Maximum records to return (default 20)',
      },
    },
    required: ['patient_id'],
  },
  handler: async (args) => {
    const supabase = createServerSupabaseClient();
    const patientId = args.patient_id as string;
    const limit = parseInt(args.limit as string || '20', 10);

    const { data, error } = await supabase
      .from('vital_signs')
      .select('id, blood_pressure_systolic, blood_pressure_diastolic, pulse_rate, respiratory_rate, temperature, oxygen_saturation, height, weight, bmi, notes, recorded_at')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        vitalSigns: data,
        count: data?.length || 0,
      },
    };
  },
};
