import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getClearancesTool: CarinaToolDefinition = {
  name: 'get_clearances',
  description: 'Get clearances for a patient. Returns medical, dental, and general clearances with status.',
  allowedRoles: ['doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
      status: {
        type: 'string',
        description: 'Filter by status: active, revoked, expired',
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
      .from('clearances')
      .select('id, clearance_type, control_number, issue_date, expiry_date, status, created_at')
      .eq('patient_id', patientId)
      .order('issue_date', { ascending: false })
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
        clearances: data,
        count: data?.length || 0,
      },
    };
  },
};
