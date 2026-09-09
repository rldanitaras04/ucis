'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchDentalRecords(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('encounters')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .eq('encounter_type', 'dental')
      .order('encounter_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
