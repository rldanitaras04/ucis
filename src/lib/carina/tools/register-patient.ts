import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const registerPatientTool: CarinaToolDefinition = {
  name: 'register_patient',
  description: 'Register a new patient in the system. Requires first name, last name, and gender.',
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
      contact_number: {
        type: 'string',
        description: 'Patient contact number',
      },
      date_of_birth: {
        type: 'string',
        description: 'Patient date of birth (YYYY-MM-DD)',
      },
      gender: {
        type: 'string',
        description: 'Patient gender (male/female/other)',
        enum: ['male', 'female', 'other'],
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
      patient_type: {
        type: 'string',
        description: 'Patient type',
        enum: ['student', 'faculty', 'non_teaching_staff', 'walk_in'],
      },
    },
    required: ['first_name', 'last_name', 'gender'],
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    const { data: patient, error } = await supabase
      .rpc('register_patient', {
        p_first_name: args.first_name,
        p_last_name: args.last_name,
        p_date_of_birth: args.date_of_birth || null,
        p_gender: args.gender,
        p_patient_type: args.patient_type || 'walk_in',
        p_email: args.email || null,
        p_contact_number: args.contact_number || null,
        p_blood_type: args.blood_type || null,
        p_allergies: args.allergies || null,
        p_emergency_contact_name: args.emergency_contact_name || null,
        p_emergency_contact_phone: args.emergency_contact_phone || null,
        p_university_id: args.university_id || null,
      })
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.rpc('write_audit_log', {
      p_actor: ctx.userId,
      p_action: 'carina.register_patient',
      p_resource_type: 'patient_profiles',
      p_resource_id: patient,
      p_outcome: 'success',
    });

    return {
      success: true,
      data: {
        patientId: patient,
        name: `${args.first_name} ${args.last_name}`,
        message: 'Patient registered successfully',
      },
    };
  },
};
