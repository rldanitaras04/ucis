import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getDashboardStatsTool: CarinaToolDefinition = {
  name: 'get_dashboard_stats',
  description: 'Get today dashboard statistics including queue status, patient counts, and clinic activity.',
  allowedRoles: [],
  inputSchema: {
    type: 'object',
    properties: {
      clinic_id: {
        type: 'string',
        description: 'Optional clinic ID to filter stats by clinic',
      },
    },
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    let queueQuery = supabase
      .from('queue_entries')
      .select('status')
      .eq('queue_date', today);

    if (args.clinic_id) {
      queueQuery = queueQuery.eq('clinic_id', args.clinic_id);
    }

    const { data: queueData, error: queueError } = await queueQuery;

    if (queueError) {
      return { success: false, error: queueError.message };
    }

    const waiting = queueData?.filter(q => q.status === 'waiting').length || 0;
    const inService = queueData?.filter(q => q.status === 'in_service').length || 0;
    const completed = queueData?.filter(q => q.status === 'completed').length || 0;
    const total = queueData?.length || 0;

    const { count: patientCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: encounterCount } = await supabase
      .from('encounters')
      .select('*', { count: 'exact', head: true })
      .eq('visit_date', today);

    return {
      success: true,
      data: {
        queue: {
          waiting,
          inService,
          completed,
          total,
        },
        patients: {
          totalActive: patientCount || 0,
        },
        encounters: {
          today: encounterCount || 0,
        },
      },
    };
  },
};
