import { CarinaToolDefinition } from '../types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const getNotificationsTool: CarinaToolDefinition = {
  name: 'get_notifications',
  description: 'Get the current user notifications. Returns unread and recent notifications.',
  allowedRoles: [],
  inputSchema: {
    type: 'object',
    properties: {
      unread_only: {
        type: 'string',
        description: 'Set to "true" to show only unread notifications',
      },
      limit: {
        type: 'string',
        description: 'Maximum number of notifications to return (default 20)',
      },
    },
  },
  handler: async (args, ctx) => {
    if (!ctx.userId) {
      return { success: false, error: 'User ID not available' };
    }

    const supabase = createServerSupabaseClient();
    const limit = parseInt(args.limit as string || '20', 10);

    let query = supabase
      .from('notifications')
      .select('id, title, body, notification_type, is_read, created_at')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (args.unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const unreadCount = data?.filter(n => !n.is_read).length || 0;

    return {
      success: true,
      data: {
        notifications: data,
        unreadCount,
        total: data?.length || 0,
      },
    };
  },
};
