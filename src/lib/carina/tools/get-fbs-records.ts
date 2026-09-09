import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getFbsRecordsTool: CarinaToolDefinition = {
  name: 'get_fbs_records',
  description: 'Get fasting blood sugar (FBS) history for a patient. Returns FBS values with dates and classifications.',
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
      .from('fbs_records')
      .select('id, fbs_value, fasting_hours, status, notes, recorded_at')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        fbsRecords: data,
        count: data?.length || 0,
      },
    };
  },
};
