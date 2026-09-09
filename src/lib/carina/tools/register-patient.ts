import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const registerPatientTool: CarinaToolDefinition = {
  name: 'register_patient',
  description: 'Register a new patient in the system. Requires first name, last name, and sex.',
  allowedRoles: ['clinic_staff', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      first_name: {
        type: 'string',
        description: 'Patient first name',
      },
      last_name: {
        type: 'string',
        description: 'Patient last name',
      },
      email: {
        type: 'string',
        description: 'Patient email address',
      },
      phone: {
        type: 'string',
        description: 'Patient phone number',
      },
      date_of_birth: {
        type: 'string',
        description: 'Patient date of birth (YYYY-MM-DD)',
      },
      sex: {
        type: 'string',
        description: 'Patient sex (male/female)',
        enum: ['male', 'female'],
      },
      blood_type: {
        type: 'string',
        description: 'Blood type (A, B, AB, O)',
      },
      allergies: {
        type: 'string',
        description: 'Known allergies',
      },
      emergency_contact_name: {
        type: 'string',
        description: 'Emergency contact name',
      },
      emergency_contact_phone: {
        type: 'string',
        description: 'Emergency contact phone',
      },
      university_id: {
        type: 'string',
        description: 'University or employee ID',
      },
      user_type: {
        type: 'string',
        description: 'Patient type',
        enum: ['student', 'faculty', 'non_teaching_staff', 'walk_in'],
      },
    },
    required: ['first_name', 'last_name', 'sex'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    const { data: patient, error } = await supabase
      .from('patient_profiles')
      .insert({
        first_name: args.first_name,
        last_name: args.last_name,
        email: args.email || null,
        phone: args.phone || null,
        date_of_birth: args.date_of_birth || null,
        sex: args.sex,
        blood_type: args.blood_type || null,
        allergies: args.allergies || null,
        emergency_contact_name: args.emergency_contact_name || null,
        emergency_contact_phone: args.emergency_contact_phone || null,
        university_id: args.university_id || null,
        user_type: args.user_type || 'walk_in',
        status: 'active',
      })
      .select('id, first_name, last_name')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.register_patient',
      p_resource_type: 'patient_profiles',
      p_resource_id: patient.id,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        patientId: patient.id,
        name: `${patient.first_name} ${patient.last_name}`,
        message: 'Patient registered successfully',
      },
    };
  },
};
