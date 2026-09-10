'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchAuditLogs(filters?: {
  actor?: string;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 100);

    if (filters?.actor) {
      query = query.eq('actor', filters.actor);
    }
    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }
    if (filters?.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchAuditLogStats(): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [todayResult, weekResult, monthResult, actionBreakdown] = await Promise.all([
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', thisWeek),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', thisMonth),
      supabase.from('audit_logs').select('action').order('created_at', { ascending: false }).limit(1000),
    ]);

    // Count action types
    const actionCounts: Record<string, number> = {};
    actionBreakdown.data?.forEach((log) => {
      const baseAction = log.action.split('.')[0];
      actionCounts[baseAction] = (actionCounts[baseAction] || 0) + 1;
    });

    return {
      success: true,
      data: {
        today: todayResult.count || 0,
        thisWeek: weekResult.count || 0,
        thisMonth: monthResult.count || 0,
        actionBreakdown: Object.entries(actionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10),
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchLoginHistory(filters?: {
  user_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('login_history')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(filters?.limit || 100);

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.start_date) {
      query = query.gte('login_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('login_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
