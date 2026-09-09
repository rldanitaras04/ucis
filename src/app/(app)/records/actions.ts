'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchPatients(searchQuery?: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('patient_profiles')
      .select('*')
      .order('last_name', { ascending: true });

    if (searchQuery) {
      query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,patient_id.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
