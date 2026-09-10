'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const BUCKET_NAME = 'ucis-bucket';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

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
  avatar_signed_url?: string | null;
}

/**
 * Get a signed URL for an avatar stored in Supabase storage.
 * @param supabase - Supabase client
 * @param avatarUrl - The stored avatar URL (contains the path)
 * @returns Signed URL or null
 */
async function getAvatarSignedUrl(supabase: any, avatarUrl: string | null): Promise<string | null> {
  if (!avatarUrl) return null;

  let path: string;

  if (avatarUrl.startsWith('avatars/')) {
    path = avatarUrl;
  } else {
    const pathMatch = avatarUrl.match(/avatars\/(.+)/);
    if (!pathMatch) return null;
    path = `avatars/${pathMatch[1]}`;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error) {
    console.error('Signed URL error:', error.message);
    return null;
  }

  return data?.signedUrl || null;
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

    // Get signed URL for avatar
    const avatarSignedUrl = await getAvatarSignedUrl(supabase, data.avatar_url);

    return {
      success: true,
      data: {
        ...data,
        avatar_signed_url: avatarSignedUrl,
      },
    };
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
      const pathMatch = profile.avatar_url.match(/avatars\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from(BUCKET_NAME).remove([`avatars/${pathMatch[1]}`]);
      }
    }

    // Upload new avatar
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}/avatar.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

    if (signedUrlError) throw signedUrlError;
    if (!signedUrlData?.signedUrl) {
      return { success: false, error: 'Failed to generate avatar URL' };
    }

    const avatarUrl = signedUrlData.signedUrl;

    // Update profile with storage path
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
      .eq('auth_user_id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError.message);
      throw updateError;
    }

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

export async function removeAvatar(): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    // Get current avatar path
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    if (profile?.avatar_url) {
      const pathMatch = profile.avatar_url.match(/avatars\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from(BUCKET_NAME).remove([`avatars/${pathMatch[1]}`]);
      }
    }

    // Clear avatar_url in profile
    const { error } = await supabase
      .from('user_profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('auth_user_id', user.id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_action: 'profile.remove_avatar',
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
