'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchReportStats(dateRange: 'week' | 'month' | 'year' = 'month'): Promise<{
  success: true;
  data: {
    totalPatients: number;
    periodEncounters: number;
    periodPrescriptions: number;
    periodReferrals: number;
    clinicBreakdown: { name: string; count: number }[];
  };
} | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const now = new Date();
    let startDate: Date;
    if (dateRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const startDateStr = startDate.toISOString();

    const [patientsResult, encountersResult, prescriptionsResult, referralsResult, clinicResult] = await Promise.all([
      supabase.from('patient_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('encounters').select('id', { count: 'exact', head: true }).gte('encounter_date', startDateStr),
      supabase.from('prescriptions').select('id', { count: 'exact', head: true }).gte('prescribed_date', startDateStr),
      supabase.from('referrals').select('id', { count: 'exact', head: true }).gte('referral_date', startDateStr),
      supabase.from('encounters').select('clinic:clinics!clinic_id(name)').gte('encounter_date', startDateStr),
    ]);

    const clinicCounts: Record<string, number> = {};
    (clinicResult.data || []).forEach((row: any) => {
      const name = row.clinic?.name || 'Unknown';
      clinicCounts[name] = (clinicCounts[name] || 0) + 1;
    });
    const clinicBreakdown = Object.entries(clinicCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      data: {
        totalPatients: patientsResult.count || 0,
        periodEncounters: encountersResult.count || 0,
        periodPrescriptions: prescriptionsResult.count || 0,
        periodReferrals: referralsResult.count || 0,
        clinicBreakdown,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}
