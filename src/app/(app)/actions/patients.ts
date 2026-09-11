'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface PatientSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: string;
  blood_type?: string;
  contact_number?: string;
  email?: string;
}

export async function searchPatients(query: string): Promise<{ success: true; data: PatientSearchResult[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    let q = supabase
      .from('patient_profiles')
      .select('id, first_name, last_name, date_of_birth, gender, blood_type, contact_number, email')
      .order('last_name', { ascending: true })
      .limit(20);

    if (query && query.trim().length > 0) {
      q = q.or(
        `id.eq.${query},first_name.ilike.%${query}%,last_name.ilike.%${query}%,university_id.ilike.%${query}%`
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
