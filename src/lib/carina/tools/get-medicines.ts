import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getMedicinesTool: CarinaToolDefinition = {
  name: 'get_medicines',
  description: 'Search medicines inventory. Returns medicine names, stock levels, and categories.',
  allowedRoles: ['admin', 'super_admin'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search term for medicine name',
      },
      low_stock_only: {
        type: 'string',
        description: 'Set to "true" to show only low stock medicines',
      },
      limit: {
        type: 'string',
        description: 'Maximum results to return (default 20)',
      },
    },
  },
  handler: async (args) => {
    const supabase = createServerSupabaseClient();
    const limit = parseInt(args.limit as string || '20', 10);

    let query = supabase
      .from('medicines')
      .select('id, name, category, dosage_form, strength, unit, current_stock, reorder_level, status')
      .order('name')
      .limit(limit);

    if (args.query) {
      query = query.ilike('name', `%${args.query}%`);
    }

    if (args.low_stock_only === 'true') {
      query = query.filter('current_stock', 'lte', 'reorder_level');
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        medicines: data,
        count: data?.length || 0,
      },
    };
  },
};
