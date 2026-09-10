'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UserProfileData {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  contact_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  avatar_url: string | null;
}

export async function fetchProfile(): Promise<{ success: true; data: UserProfileData } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, middle_name, last_name, suffix, contact_number, email, date_of_birth, gender, address, avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateProfile(updates: Partial<UserProfileData>): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: updates.first_name,
        middle_name: updates.middle_name || null,
        last_name: updates.last_name,
        suffix: updates.suffix || null,
        contact_number: updates.contact_number || null,
        email: updates.email || null,
        date_of_birth: updates.date_of_birth || null,
        gender: updates.gender || null,
        address: updates.address || null,
        avatar_url: updates.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_action: 'profile.update',
      p_resource_type: 'user_profiles',
      p_resource_id: user.id,
      p_outcome: 'success'
    });

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

const BUCKET_NAME = 'ucis-bucket';

export async function uploadAvatar(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const file = formData.get('avatar') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' };
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    // Delete old avatar if exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    if (profile?.avatar_url) {
      const oldPath = profile.avatar_url.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from(BUCKET_NAME).remove([`avatars/${user.id}/${oldPath}`]);
      }
    }

    // Upload new avatar
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('auth_user_id', user.id);

    if (updateError) throw updateError;

    await supabase.rpc('write_audit_log', {
      p_action: 'profile.upload_avatar',
      p_resource_type: 'user_profiles',
      p_resource_id: user.id,
      p_outcome: 'success'
    });

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true, url: avatarUrl };
  } catch (error) {
    return handleAuthError(error);
  }
}
