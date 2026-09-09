import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const createPrescriptionTool: CarinaToolDefinition = {
  name: 'create_prescription',
  description: 'Create a new prescription for a patient. Requires medication name, dosage, and frequency.',
  allowedRoles: ['doctor', 'dentist', 'nurse', 'super_admin'],
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
      medication_name: {
        type: 'string',
        description: 'Name of the medication',
      },
      dosage: {
        type: 'string',
        description: 'Dosage (e.g., 500mg)',
      },
      frequency: {
        type: 'string',
        description: 'Frequency (e.g., 3x daily, every 8 hours)',
      },
      duration: {
        type: 'string',
        description: 'Duration (e.g., 7 days)',
      },
      quantity: {
        type: 'string',
        description: 'Quantity to dispense',
      },
      refills: {
        type: 'string',
        description: 'Number of refills allowed',
      },
      instructions: {
        type: 'string',
        description: 'Special instructions',
      },
    },
    required: ['patient_id', 'medication_name', 'dosage', 'frequency'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: args.patient_id,
        encounter_id: args.encounter_id || null,
        prescribed_by: ctx.profile?.id || ctx.userId,
        medication_name: args.medication_name,
        dosage: args.dosage,
        frequency: args.frequency,
        duration: args.duration || null,
        quantity: args.quantity ? parseInt(args.quantity as string, 10) : null,
        refills: args.refills ? parseInt(args.refills as string, 10) : 0,
        instructions: args.instructions || null,
        status: 'active',
        prescribed_date: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.create_prescription',
      p_resource_type: 'prescriptions',
      p_resource_id: prescription.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        prescriptionId: prescription.id,
        medication: args.medication_name,
        message: 'Prescription created successfully',
      },
    };
  },
};
