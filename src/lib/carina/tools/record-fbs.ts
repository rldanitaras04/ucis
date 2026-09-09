import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const recordFbsTool: CarinaToolDefinition = {
  name: 'record_fbs',
  description: 'Record fasting blood sugar (FBS) result for a patient. Auto-classifies result as normal, pre-diabetic, or high.',
  allowedRoles: ['nurse', 'doctor', 'super_admin'],
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
      fbs_value: {
        type: 'string',
        description: 'FBS value in mg/dL',
      },
      fasting_hours: {
        type: 'string',
        description: 'Number of hours fasting',
      },
      notes: {
        type: 'string',
        description: 'Additional notes',
      },
    },
    required: ['patient_id', 'fbs_value'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();
    const fbsValue = parseFloat(args.fbs_value as string);

    if (isNaN(fbsValue) || fbsValue < 0 || fbsValue > 500) {
      return { success: false, error: 'Invalid FBS value. Must be between 0 and 500 mg/dL.' };
    }

    let status = 'normal';
    if (fbsValue >= 126) status = 'high';
    else if (fbsValue >= 100) status = 'pre_diabetic';

    const { data: record, error } = await supabase
      .from('fbs_records')
      .insert({
        patient_id: args.patient_id,
        encounter_id: args.encounter_id || null,
        recorded_by: ctx.profile?.id || ctx.userId,
        fbs_value: fbsValue,
        fasting_hours: args.fasting_hours ? parseFloat(args.fasting_hours as string) : null,
        notes: args.notes || null,
        status,
        recorded_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.record_fbs',
      p_resource_type: 'fbs_records',
      p_resource_id: record.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        fbsRecordId: record.id,
        fbsValue,
        status,
        classification: status === 'normal' ? 'Normal (< 100 mg/dL)' : status === 'pre_diabetic' ? 'Pre-diabetic (100-125 mg/dL)' : 'High (>= 126 mg/dL)',
        message: 'FBS recorded successfully',
      },
    };
  },
};
