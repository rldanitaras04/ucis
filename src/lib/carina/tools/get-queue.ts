import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getQueueTool: CarinaToolDefinition = {
  name: 'get_queue',
  description: 'Get today queue status for a clinic. Returns queue entries with patient info and status.',
  allowedRoles: ['clinic_staff', 'doctor', 'dentist', 'nurse', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      clinic_id: {
        type: 'string',
        description: 'Optional clinic ID to filter queue by clinic',
      },
      status: {
        type: 'string',
        description: 'Filter by status: waiting, called, in_service, completed, cancelled',
      },
    },
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('queue_entries')
      .select('id, queue_number, status, priority, queue_date, called_at, started_at, completed_at, patient_id, clinic_id, service_id')
      .eq('queue_date', today)
      .order('queue_number', { ascending: true });

    if (args.clinic_id) {
      query = query.eq('clinic_id', args.clinic_id);
    } else if (ctx.clinicIds.length > 0) {
      query = query.in('clinic_id', ctx.clinicIds);
    }

    if (args.status) {
      query = query.eq('status', args.status);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const waiting = data?.filter(q => q.status === 'waiting').length || 0;
    const inService = data?.filter(q => q.status === 'in_service').length || 0;
    const completed = data?.filter(q => q.status === 'completed').length || 0;

    return {
      success: true,
      data: {
        queue: data,
        summary: {
          waiting,
          inService,
          completed,
          total: data?.length || 0,
        },
      },
    };
  },
};
