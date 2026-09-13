'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { Notification, NotificationPreference, NotificationPayload, NotificationPriority } from '@/lib/notifications/types';
import { NOTIFICATION_CHANNEL_POLICY } from '@/lib/notifications/types';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchNotifications(limit = 50): Promise<{ success: true; data: Notification[] } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: (data || []) as Notification[] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchUnreadCount(): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function markNotificationRead(notificationId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_action: 'notification.mark_read',
      p_resource_type: 'notifications',
      p_resource_id: notificationId,
      p_outcome: 'success'
    });

    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function markAllNotificationsRead(): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_action: 'notification.mark_all_read',
      p_resource_type: 'notifications',
      p_resource_id: user.id,
      p_outcome: 'success'
    });

    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function deleteNotification(notificationId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_action: 'notification.delete',
      p_resource_type: 'notifications',
      p_resource_id: notificationId,
      p_outcome: 'success'
    });

    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createNotification(payload: NotificationPayload): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const admin = getAdminClient();

    // Deduplication check
    if (payload.deduplicationKey) {
      const { data: existing } = await admin
        .from('notifications')
        .select('id')
        .eq('deduplication_key', payload.deduplicationKey)
        .eq('user_id', payload.userId)
        .maybeSingle();

      if (existing) {
        return { success: true, id: existing.id };
      }
    }

    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_id: payload.userId,
        actor_user_id: payload.actorUserId || null,
        title: payload.title,
        body: payload.body || null,
        notification_type: payload.eventType,
        priority: payload.priority || 'info',
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        action_url: payload.actionUrl || null,
        metadata: payload.metadata || {},
        deduplication_key: payload.deduplicationKey || null,
        expires_at: payload.expiresAt || null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('createNotification error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function notifyRole(role: string, payload: Omit<NotificationPayload, 'userId'>): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const admin = getAdminClient();

    // Get users with this role
    const { data: roles } = await admin
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (!roles) return { success: true, count: 0 };

    const { data: userRoles } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('role_id', roles.id)
      .eq('is_active', true);

    if (!userRoles || userRoles.length === 0) return { success: true, count: 0 };

    let count = 0;
    for (const ur of userRoles) {
      const result = await createNotification({ ...payload, userId: ur.user_id });
      if (result.success) count++;
    }

    return { success: true, count };
  } catch (error) {
    console.error('notifyRole error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function fetchNotificationPreferences(): Promise<{ success: true; data: NotificationPreference[] } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .order('event_type');

    if (error) throw error;
    return { success: true, data: (data || []) as NotificationPreference[] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateNotificationPreference(
  eventType: string,
  preferences: { in_app_enabled?: boolean; push_enabled?: boolean; email_enabled?: boolean; sms_enabled?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        event_type: eventType,
        ...preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,event_type' });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
