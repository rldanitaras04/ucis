import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const issueClearanceTool: CarinaToolDefinition = {
  name: 'issue_clearance',
  description: 'Issue a medical, dental, or general clearance for a patient.',
  allowedRoles: ['doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      patient_id: {
        type: 'string',
        description: 'The patient UUID',
      },
      encounter_id: {
        type: 'string',
        description: 'Optional encounter UUID',
      },
      clearance_type: {
        type: 'string',
        description: 'Type of clearance',
        enum: ['medical', 'dental', 'general'],
      },
      expiry_date: {
        type: 'string',
        description: 'Expiry date (YYYY-MM-DD)',
      },
    },
    required: ['patient_id', 'clearance_type'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const controlNumber = `UCIS-CLR-${year}${month}-${random}`;

    const { data: clearance, error } = await supabase
      .from('clearances')
      .insert({
        patient_id: args.patient_id,
        encounter_id: args.encounter_id || null,
        issued_by: ctx.profile?.id || ctx.userId,
        clearance_type: args.clearance_type,
        control_number: controlNumber,
        issue_date: now.toISOString(),
        expiry_date: args.expiry_date || null,
        status: 'active',
        created_at: now.toISOString(),
      })
      .select('id, control_number')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.issue_clearance',
      p_resource_type: 'clearances',
      p_resource_id: clearance.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        clearanceId: clearance.id,
        controlNumber: clearance.control_number,
        type: args.clearance_type,
        message: `${args.clearance_type} clearance issued. Control number: ${controlNumber}`,
      },
    };
  },
};
