'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchDocuments(filters?: {
  patient_id?: string;
  document_type?: string;
  status?: string;
}): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();

    let query = supabase
      .from('documents')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name))')
      .order('issued_at', { ascending: false });

    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchDocument(documentId: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('documents')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name, date_of_birth, gender))')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createDocument(data: {
  patient_id: string;
  encounter_id?: string;
  document_type: string;
  notes?: string;
}): Promise<{ success: true; id: string; control_number: string; verification_token: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    // Generate control number
    const { data: controlNumber, error: cnError } = await supabase.rpc('generate_document_control_number', {
      p_campus_id: '00000000-0000-0000-0000-000000000000', // Should be dynamic based on clinic
      p_document_type: data.document_type,
    });

    if (cnError) throw cnError;

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const verificationExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        document_control_number: controlNumber,
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        document_type: data.document_type,
        issued_by: user.id,
        issued_at: new Date().toISOString(),
        status: 'active',
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'document.create',
      p_resource_type: 'documents',
      p_resource_id: document.id,
      p_outcome: 'success'
    });

    revalidatePath('/documents');
    return { success: true, id: document.id, control_number: controlNumber, verification_token: verificationToken };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function revokeDocument(documentId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('documents')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('status', 'active');

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'document.revoke',
      p_resource_type: 'documents',
      p_resource_id: documentId,
      p_outcome: 'success'
    });

    revalidatePath('/documents');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function verifyDocument(verificationToken: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    const supabase = createServerSupabaseClient();

    // Use the public verification function
    const { data, error } = await supabase.rpc('verify_public_document', {
      p_token: verificationToken,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return handleAuthError(error);
  }
}
