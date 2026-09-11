'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    // Fetch recent encounters based on user role
    let encounterQuery = supabase
      .from('encounters')
      .select('id, visit_date, status, chief_complaint, patient:patient_profiles!patient_id(first_name, last_name)')
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
