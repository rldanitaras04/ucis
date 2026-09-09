import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const callNextPatientTool: CarinaToolDefinition = {
  name: 'call_next_patient',
  description: 'Call the next waiting patient from the queue. Updates queue status to called.',
  allowedRoles: ['clinic_staff', 'doctor', 'dentist', 'nurse', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      clinic_id: {
        type: 'string',
        description: 'Optional clinic ID to filter queue',
      },
    },
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_date', today)
      .eq('status', 'waiting')
      .order('queue_number', { ascending: true })
      .limit(1);

    if (args.clinic_id) {
      query = query.eq('clinic_id', args.clinic_id);
    }

    const { data: entries, error: fetchError } = await query;

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No patients waiting in the queue.' };
    }

    const next = entries[0];
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'called',
        called_at: new Date().toISOString(),
      })
      .eq('id', next.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.call_next_patient',
      p_resource_type: 'queue_entries',
      p_resource_id: next.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        queueEntryId: next.id,
        queueNumber: next.queue_number,
        patientId: next.patient_id,
        message: `Called patient queue number ${next.queue_number}`,
      },
    };
  },
};
