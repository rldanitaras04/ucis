import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const addToQueueTool: CarinaToolDefinition = {
  name: 'add_to_queue',
  description: 'Add a patient to the clinic queue. Assigns the next queue number automatically.',
  allowedRoles: ['clinic_staff', 'doctor', 'dentist', 'nurse', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
      clinic_id: {
        type: 'string',
        description: 'The clinic UUID',
      },
      service_id: {
        type: 'string',
        description: 'The service UUID',
      },
      priority: {
        type: 'string',
        description: 'Priority level (1=normal, 2=urgent, 3=emergency)',
      },
    },
    required: ['patient_id', 'clinic_id', 'service_id'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: lastEntry } = await supabase
      .from('queue_entries')
      .select('queue_number')
      .eq('clinic_id', args.clinic_id)
      .eq('service_id', args.service_id)
      .eq('queue_date', today)
      .order('queue_number', { ascending: false })
      .limit(1)
      .single();

    const nextNumber = (lastEntry?.queue_number || 0) + 1;

    const { data: entry, error } = await supabase
      .from('queue_entries')
      .insert({
        patient_id: args.patient_id,
        clinic_id: args.clinic_id,
        service_id: args.service_id,
        queue_date: today,
        queue_number: nextNumber,
        status: 'waiting',
        priority: args.priority ? parseInt(args.priority as string, 10) : 1,
      })
      .select('id, queue_number')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.add_to_queue',
      p_resource_type: 'queue_entries',
      p_resource_id: entry.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        queueEntryId: entry.id,
        queueNumber: entry.queue_number,
        message: `Patient added to queue. Queue number: ${entry.queue_number}`,
      },
    };
  },
};
