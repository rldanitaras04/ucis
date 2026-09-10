'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchConsentRecords(patientId?: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('consent_records')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientConsentStatus(patientId: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('granted_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function recordConsent(data: {
  patient_id: string;
  consent_type: string;
  granted: boolean;
  expires_at?: string;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: record, error } = await supabase
      .from('consent_records')
      .insert({
        patient_id: data.patient_id,
        consent_type: data.consent_type,
        granted: data.granted,
        granted_at: new Date().toISOString(),
        expires_at: data.expires_at || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'consent.record',
      p_resource_type: 'consent_records',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/consent');
    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function withdrawConsent(consentId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    // Record withdrawal as a new consent record with granted=false
    const { data: existing } = await supabase
      .from('consent_records')
      .select('patient_id, consent_type')
      .eq('id', consentId)
      .single();

    if (!existing) {
      return { success: false, error: 'Consent record not found' };
    }

    const { data: record, error } = await supabase
      .from('consent_records')
      .insert({
        patient_id: existing.patient_id,
        consent_type: existing.consent_type,
        granted: false,
        granted_at: new Date().toISOString(),
        notes: 'Consent withdrawn',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'consent.withdraw',
      p_resource_type: 'consent_records',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/consent');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
