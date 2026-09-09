'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchNotifications(): Promise<{ success: true; data: { id: string; title: string; message: string; type: string; is_read: boolean; created_at: string }[] } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
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
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

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
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

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

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
