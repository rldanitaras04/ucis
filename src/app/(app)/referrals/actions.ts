'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchReferrals(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('referrals')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id), from_clinic:clinics!from_clinic_id(name), to_clinic:clinics!to_clinic_id(name)')
      .order('referral_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createReferral(data: {
  patient_id: string;
  from_clinic_id: string;
  to_clinic_id: string;
  reason: string;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        patient_id: data.patient_id,
        from_clinic_id: data.from_clinic_id,
        to_clinic_id: data.to_clinic_id,
        reason: data.reason,
        notes: data.notes || null,
        referred_by: user.profile?.id || user.id,
        status: 'pending',
        referral_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'referral.create',
      p_resource_type: 'referrals',
      p_resource_id: referral.id,
      p_outcome: 'success'
    });

    return { success: true, id: referral.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function acceptReferral(referralId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('referrals')
      .update({ status: 'accepted' })
      .eq('id', referralId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'referral.accept',
      p_resource_type: 'referrals',
      p_resource_id: referralId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function rejectReferral(referralId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('referrals')
      .update({ status: 'rejected' })
      .eq('id', referralId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'referral.reject',
      p_resource_type: 'referrals',
      p_resource_id: referralId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchClinics(): Promise<{ success: true; data: { id: string; name: string }[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('clinics')
      .select('id, name')
      .order('name');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
