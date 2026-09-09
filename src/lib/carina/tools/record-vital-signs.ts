import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const recordVitalSignsTool: CarinaToolDefinition = {
  name: 'record_vital_signs',
  description: 'Record vital signs for a patient. Includes blood pressure, pulse, temperature, and BMI calculation.',
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
      blood_pressure_systolic: {
        type: 'string',
        description: 'Systolic blood pressure (mmHg)',
      },
      blood_pressure_diastolic: {
        type: 'string',
        description: 'Diastolic blood pressure (mmHg)',
      },
      pulse_rate: {
        type: 'string',
        description: 'Pulse rate (bpm)',
      },
      respiratory_rate: {
        type: 'string',
        description: 'Respiratory rate (breaths/min)',
      },
      temperature: {
        type: 'string',
        description: 'Body temperature (Celsius)',
      },
      oxygen_saturation: {
        type: 'string',
        description: 'Oxygen saturation (%)',
      },
      height: {
        type: 'string',
        description: 'Height (cm)',
      },
      weight: {
        type: 'string',
        description: 'Weight (kg)',
      },
      notes: {
        type: 'string',
        description: 'Additional notes',
      },
    },
    required: ['patient_id'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    let bmi = null;
    if (args.height && args.weight) {
      const heightM = parseFloat(args.height as string) / 100;
      const weight = parseFloat(args.weight as string);
      bmi = Math.round((weight / (heightM * heightM)) * 10) / 10;
    }

    const { data: vital, error } = await supabase
      .from('vital_signs')
      .insert({
        patient_id: args.patient_id,
        encounter_id: args.encounter_id || null,
        recorded_by: ctx.profile?.id || ctx.userId,
        blood_pressure_systolic: args.blood_pressure_systolic ? parseFloat(args.blood_pressure_systolic as string) : null,
        blood_pressure_diastolic: args.blood_pressure_diastolic ? parseFloat(args.blood_pressure_diastolic as string) : null,
        pulse_rate: args.pulse_rate ? parseFloat(args.pulse_rate as string) : null,
        respiratory_rate: args.respiratory_rate ? parseFloat(args.respiratory_rate as string) : null,
        temperature: args.temperature ? parseFloat(args.temperature as string) : null,
        oxygen_saturation: args.oxygen_saturation ? parseFloat(args.oxygen_saturation as string) : null,
        height: args.height ? parseFloat(args.height as string) : null,
        weight: args.weight ? parseFloat(args.weight as string) : null,
        bmi,
        notes: args.notes || null,
        recorded_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.record_vitals',
      p_resource_type: 'vital_signs',
      p_resource_id: vital.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        vitalSignId: vital.id,
        bmi,
        message: 'Vital signs recorded successfully',
      },
    };
  },
};
