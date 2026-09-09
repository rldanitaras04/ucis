import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getClinicsTool: CarinaToolDefinition = {
  name: 'get_clinics',
  description: 'Get a list of active clinics in the system. Returns clinic names, locations, and operating hours.',
  allowedRoles: [],
  inputSchema: {
    type: 'object',
    properties: {
      campus_id: {
        type: 'string',
        description: 'Optional campus ID to filter clinics by campus',
      },
    },
  },
  handler: async (args, ctx) => {
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('clinics')
      .select('id, name, description, location, contact_phone, operating_hours, is_active')
      .eq('is_active', true)
      .order('name');

    if (args.campus_id) {
      query = query.eq('campus_id', args.campus_id);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        clinics: data,
        count: data?.length || 0,
      },
    };
  },
};
