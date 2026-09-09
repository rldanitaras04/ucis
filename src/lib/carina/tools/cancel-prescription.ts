import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const cancelPrescriptionTool: CarinaToolDefinition = {
  name: 'cancel_prescription',
  description: 'Cancel an active prescription. This action cannot be undone.',
  allowedRoles: ['doctor', 'dentist', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      prescription_id: {
        type: 'string',
        description: 'The prescription UUID to cancel',
      },
    },
    required: ['prescription_id'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'cancelled' })
      .eq('id', args.prescription_id)
      .eq('status', 'active');

    if (error) {
      return { success: false, error: 'Failed to cancel prescription. It may already be cancelled or dispensed.' };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.cancel_prescription',
      p_resource_type: 'prescriptions',
      p_resource_id: args.prescription_id as string,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        message: 'Prescription cancelled successfully',
      },
    };
  },
};
