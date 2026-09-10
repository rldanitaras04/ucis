'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { fetchProfile, updateProfile, uploadAvatar, UserProfileData } from './actions';
import { Camera, Check } from '@phosphor-icons/react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    contact_number: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const result = await fetchProfile();
      if (result.success) {
        setProfile(result.data);
        setForm({
          first_name: result.data.first_name || '',
          middle_name: result.data.middle_name || '',
          last_name: result.data.last_name || '',
          suffix: result.data.suffix || '',
          contact_number: result.data.contact_number || '',
          email: result.data.email || '',
          date_of_birth: result.data.date_of_birth || '',
          gender: result.data.gender || '',
          address: result.data.address || '',
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('avatar', file);

    const result = await uploadAvatar(formData);
    if (result.success) {
      // Upload returns signed URL, update profile state with it
      setProfile(prev => prev ? { ...prev, avatar_signed_url: result.url } : null);
    } else {
      setError(result.error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfile({
      ...form,
      avatar_url: profile?.avatar_url || null,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-[#111827] mb-6">Profile</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <Check size={16} weight="bold" />
          Profile updated successfully
        </div>
      )}

      {/* Avatar Section */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatar_signed_url ? (
              <Image
                src={profile.avatar_signed_url}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-[#1E40AF] rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-medium">
                  {form.first_name ? form.first_name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-[#6B7280] mb-2">Profile Picture</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E40AF] bg-[#EEF2FF] rounded-lg hover:bg-[#E0E7FF] transition-colors disabled:opacity-50"
            >
              <Camera size={16} weight="regular" />
              {uploading ? 'Uploading...' : 'Change photo'}
            </button>
            <p className="text-xs text-[#9CA3AF] mt-1">JPEG, PNG, WebP, or GIF. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E5E7EB] p-6">
        <h2 className="text-lg font-medium text-[#111827] mb-4">Personal Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Middle Name
            </label>
            <input
              type="text"
              value={form.middle_name}
              onChange={e => setForm(prev => ({ ...prev, middle_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Suffix
            </label>
            <input
              type="text"
              value={form.suffix}
              onChange={e => setForm(prev => ({ ...prev, suffix: e.target.value }))}
              placeholder="Jr., Sr., III, etc."
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Contact Number
            </label>
            <input
              type="tel"
              value={form.contact_number}
              onChange={e => setForm(prev => ({ ...prev, contact_number: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Gender
            </label>
            <select
              value={form.gender}
              onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#374151] mb-1">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1E40AF] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
