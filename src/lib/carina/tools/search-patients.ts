import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const searchPatientsTool: CarinaToolDefinition = {
  name: 'search_patients',
  description: 'Search for patients by name, university ID, or email. Returns matching patient records.',
  allowedRoles: ['doctor', 'dentist', 'nurse', 'clinic_staff', 'admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search term (name, university ID, or email)',
      },
      limit: {
        type: 'string',
        description: 'Maximum results to return (default 10)',
      },
    },
    required: ['query'],
  },
  handler: async (args) => {
    const supabase = createServerSupabaseClient();
    const query = args.query as string;
    const limit = parseInt(args.limit as string || '10', 10);

    const { data, error } = await supabase
      .from('patient_profiles')
      .select('id, first_name, last_name, university_id, email, patient_type, status')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,university_id.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('status', 'active')
      .order('last_name')
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        patients: data,
        count: data?.length || 0,
      },
    };
  },
};
