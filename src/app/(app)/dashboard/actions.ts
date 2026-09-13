'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchDashboardStats(): Promise<{
  success: true;
  data: {
    waitingCount: number;
    inServiceCount: number;
    completedCount: number;
    totalPatients: number;
    todayQueue: number;
  };
} | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const today = new Date().toISOString().split('T')[0];

    const { data: queueData, error: queueError } = await supabase
      .from('queue_entries')
      .select('id, status')
      .eq('queue_date', today);

    if (queueError) throw queueError;

    const waitingCount = queueData?.filter(q => q.status === 'waiting').length || 0;
    const inServiceCount = queueData?.filter(q => q.status === 'in_service').length || 0;
    const completedCount = queueData?.filter(q => q.status === 'completed').length || 0;
    const todayQueue = queueData?.length || 0;

    const { count, error: patientError } = await supabase
      .from('patient_profiles')
      .select('id', { count: 'exact', head: true });

    if (patientError) throw patientError;

    return {
      success: true,
      data: {
        waitingCount,
        inServiceCount,
        completedCount,
        totalPatients: count || 0,
        todayQueue,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchInventoryAlerts(): Promise<{
  success: true;
  data: {
    lowStock: Array<{ medicine_id: string; medicine_name: string; total_stock: number; severity: string }>;
    nearExpiry: Array<{ medicine_id: string; medicine_name: string; batch_number: string; days_until_expiry: number; severity: string }>;
    expired: Array<{ medicine_id: string; medicine_name: string; batch_number: string; days_expired: number }>;
  };
} | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const lowStock: Array<{ medicine_id: string; medicine_name: string; total_stock: number; severity: string }> = [];
    const nearExpiry: Array<{ medicine_id: string; medicine_name: string; batch_number: string; days_until_expiry: number; severity: string }> = [];
    const expired: Array<{ medicine_id: string; medicine_name: string; batch_number: string; days_expired: number }> = [];

    // Low stock: total active batches <= 10
    const { data: lowStockData } = await supabase.rpc('check_medicine_inventory_alerts');

    if (lowStockData) {
      for (const alert of lowStockData) {
        if (alert.alert_type === 'low_stock') {
          lowStock.push({
            medicine_id: alert.medicine_id,
            medicine_name: alert.medicine_name,
            total_stock: parseInt(alert.detail) || 0,
            severity: alert.severity,
          });
        } else if (alert.alert_type === 'near_expiry') {
          nearExpiry.push({
            medicine_id: alert.medicine_id,
            medicine_name: alert.medicine_name,
            batch_number: alert.detail?.split('Batch ')[1]?.split(' expires')[0] || '',
            days_until_expiry: parseInt(alert.detail?.match(/in (\d+) days/)?.[1] || '0'),
            severity: alert.severity,
          });
        } else if (alert.alert_type === 'expired') {
          expired.push({
            medicine_id: alert.medicine_id,
            medicine_name: alert.medicine_name,
            batch_number: alert.detail?.split('Batch ')[1]?.split(' expired')[0] || '',
            days_expired: parseInt(alert.detail?.match(/(\d+) days ago/)?.[1] || '0'),
          });
        }
      }
    }

    return { success: true, data: { lowStock, nearExpiry, expired } };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchRecentActivity(): Promise<{
  success: true;
  data: {
    recentEncounters: any[];
    recentNotifications: any[];
  };
} | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();
    const adminSupabase = getAdminClient();

    // Fetch recent encounters based on user role
    let encounterQuery = adminSupabase
      .from('encounters')
      .select('id, visit_date, status, chief_complaint, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name))')
      .order('visit_date', { ascending: false })
      .limit(5);

    // If user is a patient, only show their encounters
    if (user.roles.includes('student') || user.roles.includes('faculty') || user.roles.includes('non_teaching_staff')) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const { data: patientProfile } = userProfile
        ? await supabase
            .from('patient_profiles')
            .select('id')
            .eq('user_profile_id', userProfile.id)
            .single()
        : { data: null };

      if (patientProfile) {
        encounterQuery = encounterQuery.eq('patient_id', patientProfile.id);
      }
    }

    const { data: recentEncounters, error: encounterError } = await encounterQuery;
    if (encounterError) throw encounterError;

    // Fetch recent notifications
    const { data: recentNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, title, body, notification_type, created_at, is_read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifError) throw notifError;

    return {
      success: true,
      data: {
        recentEncounters: recentEncounters || [],
        recentNotifications: recentNotifications || [],
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}
