import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getPrescriptionsTool: CarinaToolDefinition = {
  name: 'get_prescriptions',
  description: 'Get prescriptions for a patient. Returns medication details, dosage, and status.',
  allowedRoles: ['doctor', 'dentist', 'nurse', 'clinic_staff', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
      status: {
        type: 'string',
        description: 'Filter by status: active, dispensed, cancelled, expired',
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

    let query = supabase
      .from('prescriptions')
      .select('id, medication_name, dosage, frequency, duration, quantity, refills, instructions, status, prescribed_date, created_at')
      .eq('patient_id', patientId)
      .order('prescribed_date', { ascending: false })
      .limit(limit);

    if (args.status) {
      query = query.eq('status', args.status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        prescriptions: data,
        count: data?.length || 0,
      },
    };
  },
};
