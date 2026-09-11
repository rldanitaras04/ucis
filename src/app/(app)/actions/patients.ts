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
  university_id?: string;
}

export async function searchPatients(query: string): Promise<{ success: true; data: PatientSearchResult[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const trimmed = query.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    let q = supabase
      .from('patient_profiles')
      .select('id, first_name, last_name, date_of_birth, gender, blood_type, contact_number, email, university_id')
      .order('last_name', { ascending: true })
      .limit(20);

    if (isUuid) {
      q = q.eq('id', trimmed);
    } else {
      q = q.or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,university_id.ilike.%${trimmed}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
